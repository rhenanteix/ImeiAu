import { AppError } from "./domain";
import type { ImeiValidationResult } from "./imei";

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
export type ImeiProviderReply = {
  historyId?: string;
  result?: ImeiValidationResult;
};

// Explicit allow-list: absent / unfamiliar reports must never become CLEAN.
export function parseImeiReport(
  value: unknown,
  expectedImei: string,
  statusField = "blacklist_status",
): ImeiProviderReply {
  const data = object(value);
  const rawHistory = data.history_id ?? data.ulid ?? data.id;
  const historyId =
    typeof rawHistory === "string" || typeof rawHistory === "number"
      ? String(rawHistory)
      : undefined;
  if (["In_progress", "Pending", "Processing"].includes(String(data.status)))
    return { historyId };
  if (data.status && data.status !== "Done")
    throw new AppError(
      502,
      "O provedor não concluiu a consulta de IMEI. Tente novamente mais tarde.",
    );
  const report = data.result == null ? data : object(data.result);
  const returnedImei = report.imei ?? data.imei;
  if (returnedImei != null && String(returnedImei) !== expectedImei)
    throw new AppError(
      502,
      "O provedor retornou um identificador diferente. Não foi possível validar o aparelho.",
    );
  const statusValue = statusField
    .split(".")
    .reduce<unknown>((entry, part) => object(entry)[part], report);
  const status =
    typeof statusValue === "string" ? statusValue.trim().toUpperCase() : "";
  if (!["CLEAN", "BLACKLISTED"].includes(status)) {
    if (historyId && !data.result && !statusValue) return { historyId };
    throw new AppError(
      502,
      "A consulta não retornou um status de blacklist reconhecido. O aparelho não foi liberado.",
    );
  }
  const blocked = status === "BLACKLISTED";
  return {
    historyId,
    result: {
      valid: !blocked,
      isLuhnValid: true,
      blocked,
      ...(blocked
        ? {
            reason:
              "O IMEI consta na blacklist consultada. Não é possível concluir o trade-in deste aparelho.",
          }
        : {}),
      details: {
        source: "IMEI.info",
        status: blocked ? "blocked" : "clean",
        blacklistChecked: true,
        checkedAt: new Date().toISOString(),
        ...(typeof report.brand === "string" ? { brand: report.brand } : {}),
        ...(typeof report.model === "string" ? { model: report.model } : {}),
      },
    },
  };
}

export async function fetchImeiReport(
  imei: string,
  config: {
    apiKey: string;
    serviceId: string;
    statusField?: string;
    historyId?: string;
  },
  fetcher: typeof fetch = fetch,
): Promise<ImeiProviderReply> {
  if (!/^\d+$/.test(config.serviceId))
    throw new AppError(
      503,
      "O serviço de consulta de IMEI ainda não está configurado.",
    );
  const path = config.historyId
    ? `/api/search_history/${encodeURIComponent(config.historyId)}/`
    : `/api-sync/check/${config.serviceId}/`;
  const url = new URL(path, "https://dash.imei.info");
  url.searchParams.set("API_KEY", config.apiKey);
  url.searchParams.set("format", "json");
  if (!config.historyId) url.searchParams.set("imei", imei);
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    // Do not log fetch errors: this API authenticates via a secret query parameter.
    throw new AppError(
      503,
      "Não foi possível consultar a IMEI.info agora. Tente novamente mais tarde.",
    );
  }
  if ([401, 403, 404].includes(response.status))
    throw new AppError(
      503,
      "O serviço IMEI.info precisa de configuração. Contate a loja.",
    );
  if (response.status === 402)
    throw new AppError(
      503,
      "A consulta de IMEI está temporariamente indisponível. Contate a loja.",
    );
  if (response.status === 429)
    throw new AppError(
      503,
      "O serviço de IMEI está ocupado. Aguarde e tente novamente.",
    );
  if (response.status === 422)
    throw new AppError(
      422,
      "O provedor recusou o IMEI. Confira os 15 dígitos.",
    );
  if (!response.ok)
    throw new AppError(
      502,
      "A consulta de IMEI falhou. Tente novamente mais tarde.",
    );
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AppError(502, "Resposta inválida do serviço de IMEI.");
  }
  if (response.status === 202) {
    const pending = object(data);
    const id = pending.history_id ?? pending.ulid;
    if (typeof id !== "string" && typeof id !== "number")
      throw new AppError(
        502,
        "Consulta pendente sem identificador de acompanhamento.",
      );
    return { historyId: String(id) };
  }
  return parseImeiReport(data, imei, config.statusField);
}

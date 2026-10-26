module.exports=[1170,t=>t.a(async(e,a)=>{try{var i=t.i(66680),s=t.i(43793),n=t.i(51681),u=e([s]);async function E(t,e,a,u){let E=BigInt(Date.now()),R=E-BigInt(u),o=`imeiau:${t}:${(0,i.createHash)("sha256").update(e).digest("hex")}`;if((await s.db.$queryRaw`
    INSERT INTO "RateLimit" ("id", "key", "count", "lastRequest") VALUES (${(0,i.randomUUID)()}, ${o}, 1, ${E})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."lastRequest" < ${R} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "RateLimit"."lastRequest" < ${R} THEN ${E} ELSE "RateLimit"."lastRequest" END
    RETURNING "count"
  `)[0].count>a)throw new n.A(429,"Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.")}[s]=u.then?(await u)():u,t.s(["requestLimit",0,E]),a()}catch(t){a(t)}},!1)];

//# sourceMappingURL=src_lib_request-limit_ts_08vadky87phr_._.js.map
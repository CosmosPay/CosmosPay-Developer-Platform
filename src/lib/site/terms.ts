/* terms.ts: the text of the terms (cosmospay.lat/tos), which cover BOTH Cosmos Pay products:
 *   1. the crypto payment gateway (payments API, swaps, fiat on/off-ramp), and
 *   2. the Cosmos Pay non-custodial wallet for Stellar, Solana and Monad (app + browser extension).
 * Written in English and Spanish (TOS_LANGS in src/lib/seo/lang-urls.ts, PAGE_LANGS.tos); any
 * other language shows the English text. src/pages/site/tos.astro renders it and the Markdown
 * version of the page (src/lib/seo/site-markdown.ts) reads it too, so both say the same words.
 * NOTE: template terms; have counsel review before relying on them legally. Pure. */

export type TermsSection = { h: string; ps: string[] };
export interface TermsText {
  title: string;
  /** The label before the date of the last update. */
  updated: string;
  intro: string;
  sections: TermsSection[];
}

const en: TermsText = {
  title: "Terms and Conditions of Use",
  updated: "Last updated",
  intro:
    "These Terms govern your use of Cosmos Pay: the crypto payment gateway (payments API, swaps and fiat on/off-ramp) and the Cosmos Pay non-custodial wallet for Stellar, Solana and Monad (mobile app, web app and browser extension). By using any of them you accept these Terms. If you do not agree, do not use the services.",
  sections: [
    {
      h: "1. Who we are",
      ps: [
        "“Cosmos Pay” (“we”) provides open, multi-chain payment infrastructure on the Stellar, Solana and Monad networks: a developer platform (dev.cosmospay.lat), a payments gateway (api.cosmospay.lat) and a non-custodial wallet. Contact: organization@cosmospay.lat.",
      ],
    },
    {
      h: "2. Non-custodial wallet: your keys, your responsibility",
      ps: [
        "The wallet generates and encrypts your keys locally on your device. We never receive, store or can recover your recovery phrase, secret key or password.",
        "You are solely and exclusively responsible for safekeeping your recovery phrase and password, and for all funds in your wallet. If you lose the phrase and forget the password, the funds are irrecoverable by anyone, including us.",
        "All transactions you sign are executed on the public blockchain network they belong to (Stellar, Solana or Monad) and are irreversible. Verify addresses and amounts before confirming; we cannot cancel, reverse or refund on-chain transactions.",
      ],
    },
    {
      h: "3. Payment gateway & developer platform",
      ps: [
        "The gateway lets registered users and developers create payment intents, quotes and swaps on Stellar, Solana and Monad via API keys issued by the developer platform. You are responsible for keeping your API keys secret and for all activity performed with them.",
        "Swap quotes are estimates; the executed price may differ within the disclosed slippage tolerance. Network fees and, where applicable, service fees are shown before you confirm.",
        "We may throttle, suspend or revoke API access that abuses the service, breaks the law or harms other users.",
      ],
    },
    {
      h: "4. Fiat services (on/off-ramp)",
      ps: [
        "Fiat deposits and withdrawals are provided through third-party regulated partners (e.g. BlindPay) and require identity verification (KYC). By using them you also accept the partner's terms and privacy policy.",
        "Fiat services are available only to adults (18+). We may deny, limit or reverse fiat operations to comply with law, sanctions or partner requirements.",
      ],
    },
    {
      h: "5. Eligibility",
      ps: [
        "You must be at least 13 years old to use the wallet, and at least 18 to use fiat services. By using the services you represent that you meet these requirements and that your use is legal in your jurisdiction.",
      ],
    },
    {
      h: "6. Risks",
      ps: [
        "Crypto-assets are volatile; their value can go to zero. Blockchain transactions are irreversible. Software may contain defects. Regulatory changes may affect the services. You use the services at your own risk and should never commit funds you cannot afford to lose.",
      ],
    },
    {
      h: "7. Prohibited use",
      ps: [
        "You may not use the services for money laundering, terrorism financing, fraud, sanctions evasion or any illegal activity; to interfere with or abuse the infrastructure; or to infringe third-party rights. We may suspend access and report activity where the law requires it.",
      ],
    },
    {
      h: "8. Privacy",
      ps: [
        "The wallet stores your profile data (name, email, birthdate, gender) locally on your device. The email is sent to us only if you opt in to create/link a Cosmos Pay account. Anonymous usage metrics and promotional communications are strictly opt-in. KYC data is processed by the fiat partner, not by us.",
      ],
    },
    {
      h: "9. No warranty & limitation of liability",
      ps: [
        "The services are provided “as is”, without warranties of any kind. To the maximum extent permitted by law, we are not liable for lost funds resulting from lost phrases/passwords, user error, on-chain behaviour, third-party services (the Stellar, Solana and Monad networks and their nodes, Horizon, swap aggregators, price feeds, fiat partners), force majeure, or indirect or consequential damages. Nothing here excludes liability that cannot be excluded by law.",
      ],
    },
    {
      h: "10. Changes and termination",
      ps: [
        "We may update these Terms; material changes will be posted on this page with a new date. Continuing to use the services after a change means you accept it. You can stop using the services at any time; because the wallet is non-custodial, your funds remain yours regardless.",
      ],
    },
    {
      h: "11. Contact",
      ps: ["Questions about these Terms: organization@cosmospay.lat."],
    },
  ],
};

const es: TermsText = {
  title: "Términos y Condiciones de Uso",
  updated: "Última actualización",
  intro:
    "Estos Términos regulan tu uso de Cosmos Pay: la pasarela de pagos cripto (API de pagos, swaps y on/off-ramp fiat) y la wallet no custodial para Stellar, Solana y Monad (app móvil, web y extensión de navegador). Al usar cualquiera de ellos aceptas estos Términos. Si no estás de acuerdo, no uses los servicios.",
  sections: [
    {
      h: "1. Quiénes somos",
      ps: [
        "“Cosmos Pay” (“nosotros”) ofrece infraestructura abierta de pagos multichain sobre las redes Stellar, Solana y Monad: una plataforma para desarrolladores (dev.cosmospay.lat), una pasarela de pagos (api.cosmospay.lat) y una wallet no custodial. Contacto: organization@cosmospay.lat.",
      ],
    },
    {
      h: "2. Wallet no custodial: tus claves, tu responsabilidad",
      ps: [
        "La wallet genera y cifra tus claves localmente en tu dispositivo. Nunca recibimos, guardamos ni podemos recuperar tu frase de recuperación, tu clave secreta ni tu contraseña.",
        "Eres única y exclusivamente responsable de custodiar tu frase de recuperación y tu contraseña, y de todos los fondos de tu wallet. Si pierdes la frase y olvidas la contraseña, los fondos son irrecuperables para cualquiera, incluidos nosotros.",
        "Toda transacción que firmes se ejecuta en la red blockchain pública a la que pertenece (Stellar, Solana o Monad) y es irreversible. Verifica direcciones e importes antes de confirmar; no podemos cancelar, revertir ni reembolsar transacciones on-chain.",
      ],
    },
    {
      h: "3. Pasarela de pagos y plataforma de desarrolladores",
      ps: [
        "La pasarela permite a usuarios y desarrolladores registrados crear intentos de pago, cotizaciones y swaps en Stellar, Solana y Monad mediante claves API emitidas por la plataforma. Eres responsable de mantener en secreto tus claves API y de toda la actividad realizada con ellas.",
        "Las cotizaciones de swap son estimaciones; el precio ejecutado puede variar dentro de la tolerancia de slippage mostrada. Las comisiones de red y, en su caso, de servicio se muestran antes de confirmar.",
        "Podemos limitar, suspender o revocar el acceso API que abuse del servicio, incumpla la ley o dañe a otros usuarios.",
      ],
    },
    {
      h: "4. Servicios fiat (on/off-ramp)",
      ps: [
        "Los depósitos y retiros fiat se prestan a través de socios regulados de terceros (p. ej. BlindPay) y requieren verificación de identidad (KYC). Al usarlos aceptas también los términos y la política de privacidad del socio.",
        "Los servicios fiat están disponibles solo para mayores de edad (18+). Podemos denegar, limitar o revertir operaciones fiat para cumplir la ley, sanciones o requisitos del socio.",
      ],
    },
    {
      h: "5. Elegibilidad",
      ps: [
        "Debes tener al menos 13 años para usar la wallet y al menos 18 para usar los servicios fiat. Al usar los servicios declaras que cumples estos requisitos y que tu uso es legal en tu jurisdicción.",
      ],
    },
    {
      h: "6. Riesgos",
      ps: [
        "Los criptoactivos son volátiles; su valor puede llegar a cero. Las transacciones en blockchain son irreversibles. El software puede contener defectos. Cambios regulatorios pueden afectar a los servicios. Usas los servicios bajo tu propio riesgo y nunca deberías comprometer fondos que no puedas permitirte perder.",
      ],
    },
    {
      h: "7. Uso prohibido",
      ps: [
        "No puedes usar los servicios para blanqueo de capitales, financiación del terrorismo, fraude, evasión de sanciones o cualquier actividad ilegal; para interferir o abusar de la infraestructura; ni para infringir derechos de terceros. Podemos suspender el acceso y reportar actividad cuando la ley lo exija.",
      ],
    },
    {
      h: "8. Privacidad",
      ps: [
        "La wallet guarda tus datos de perfil (nombre, correo, fecha de nacimiento, género) localmente en tu dispositivo. El correo solo se nos envía si eliges crear/vincular una cuenta de Cosmos Pay. Las métricas anónimas de uso y las comunicaciones promocionales son estrictamente opt-in. Los datos KYC los trata el socio fiat, no nosotros.",
      ],
    },
    {
      h: "9. Sin garantías y limitación de responsabilidad",
      ps: [
        "Los servicios se prestan “tal cual”, sin garantías de ningún tipo. En la máxima medida permitida por la ley, no respondemos por fondos perdidos por pérdida de frases/contraseñas, error del usuario, comportamiento on-chain, servicios de terceros (las redes Stellar, Solana y Monad y sus nodos, Horizon, agregadores de swaps, feeds de precios, socios fiat), fuerza mayor, ni por daños indirectos o consecuenciales. Nada de lo anterior excluye responsabilidades que la ley no permita excluir.",
      ],
    },
    {
      h: "10. Cambios y terminación",
      ps: [
        "Podemos actualizar estos Términos; los cambios relevantes se publicarán en esta página con nueva fecha. Seguir usando los servicios tras un cambio implica aceptarlo. Puedes dejar de usar los servicios en cualquier momento; al ser la wallet no custodial, tus fondos siguen siendo tuyos en todo caso.",
      ],
    },
    {
      h: "11. Contacto",
      ps: ["Dudas sobre estos Términos: organization@cosmospay.lat."],
    },
  ],
};

export const TERMS: Record<"en" | "es", TermsText> = { en, es };

/** The terms in a language: Spanish for "es", English for any other. */
export function termsText(lang: string | null | undefined): TermsText {
  return lang === "es" ? TERMS.es : TERMS.en;
}

/* i18n.ts: the embed's end-user copy, in the five languages Cosmos Pay ships.

   It lives in the bundle (public/embed/cosmos-pay.js runs on a merchant's page and cannot
   read the payments site's catalog at runtime), and it is a copy of that catalog's wording on
   purpose: `checkout.*` here repeats `checkout.*` of src/lib/payments/i18n.ts word for word,
   so a payer reads the same sentences inline and on the hosted page.
   tests/unit/embedI18n.test.ts fails when the two drift. The exceptions are the strings that
   only exist here (`button.*`) and one sentence that does not fit inline: the hosted page's
   "paid" line tells the payer they may close the page, and inline there is no page to close
   (`checkout.body.paid`). `by` is the hosted page's footer line; `demo` is the line a `demo`
   checkout shows on top. */

export const EMBED_LOCALES = ["en", "es", "pt", "fr", "de"] as const;
export type EmbedLocale = (typeof EMBED_LOCALES)[number];

const en = {
  button: {
    label: "Pay with Cosmos Pay",
    newWindow: "Opens in a new window",
  },
  by: "Payments by Cosmos Pay",
  demo: "Demo: a sample payment that can’t be paid.",
  checkout: {
    eyebrow: "Payment request",
    loading: "Loading payment…",
    anyAmount: "Any amount",
    anyAmountHint: "You choose the amount in your wallet.",
    testnet: "Test network: no real funds move",
    phase: {
      open: "Awaiting payment",
      processing: "Confirming payment",
      paid: "Paid",
      failed: "Payment failed",
      cancelled: "Cancelled",
      expired: "Expired",
    },
    body: {
      open: "Scan the code with your wallet app, or open the link on this device.",
      processing: "The payment was submitted. Waiting for the network to confirm it.",
      paid: "The payment is confirmed.",
      failed: "The payment didn’t go through. Ask the merchant for a new link.",
      cancelled: "The merchant cancelled this payment link.",
      expired: "This payment link has expired. Ask the merchant for a new one.",
    },
    qrAlt: "QR code with this payment request. Scan it with your wallet app.",
    openWallet: "Open in wallet",
    network: "Network",
    mainnet: "Mainnet",
    testnetTier: "Testnet",
    asset: "Asset",
    expires: "Expires",
    notFoundTitle: "Payment link not found",
    notFoundBody: "Check the link, or ask the merchant to send it again.",
    errorTitle: "We couldn’t load this payment",
    errorBody: "Check your connection. We’ll keep trying.",
    rateLimited: "Too many requests from your network. Trying again shortly.",
    retry: "Try again",
  },
};
export type EmbedMessages = typeof en;

const es: EmbedMessages = {
  button: {
    label: "Pagar con Cosmos Pay",
    newWindow: "Se abre en una ventana nueva",
  },
  by: "Pagos por Cosmos Pay",
  demo: "Demo: un pago de ejemplo que no se puede pagar.",
  checkout: {
    eyebrow: "Solicitud de pago",
    loading: "Cargando el pago…",
    anyAmount: "Importe libre",
    anyAmountHint: "Eliges el importe en tu wallet.",
    testnet: "Red de pruebas: no se mueven fondos reales",
    phase: {
      open: "Esperando el pago",
      processing: "Confirmando el pago",
      paid: "Pagado",
      failed: "El pago falló",
      cancelled: "Cancelado",
      expired: "Vencido",
    },
    body: {
      open: "Escanea el código con tu wallet o abre el enlace en este dispositivo.",
      processing: "El pago se envió. Esperando que la red lo confirme.",
      paid: "El pago está confirmado.",
      failed: "El pago no se completó. Pide al comercio un enlace nuevo.",
      cancelled: "El comercio canceló este enlace de pago.",
      expired: "Este enlace de pago venció. Pide al comercio uno nuevo.",
    },
    qrAlt: "Código QR con esta solicitud de pago. Escanéalo con tu wallet.",
    openWallet: "Abrir en la wallet",
    network: "Red",
    mainnet: "Mainnet",
    testnetTier: "Testnet",
    asset: "Activo",
    expires: "Vence",
    notFoundTitle: "Enlace de pago no encontrado",
    notFoundBody: "Revisa el enlace o pide al comercio que te lo envíe de nuevo.",
    errorTitle: "No pudimos cargar este pago",
    errorBody: "Revisa tu conexión. Seguimos intentando.",
    rateLimited: "Demasiadas solicitudes desde tu red. Reintentamos en breve.",
    retry: "Reintentar",
  },
};

const pt: EmbedMessages = {
  button: {
    label: "Pagar com Cosmos Pay",
    newWindow: "Abre em uma nova janela",
  },
  by: "Pagamentos por Cosmos Pay",
  demo: "Demo: um pagamento de exemplo que não pode ser pago.",
  checkout: {
    eyebrow: "Solicitação de pagamento",
    loading: "Carregando o pagamento…",
    anyAmount: "Valor livre",
    anyAmountHint: "Você escolhe o valor na sua carteira.",
    testnet: "Rede de testes: nenhum fundo real é movimentado",
    phase: {
      open: "Aguardando pagamento",
      processing: "Confirmando pagamento",
      paid: "Pago",
      failed: "O pagamento falhou",
      cancelled: "Cancelado",
      expired: "Expirado",
    },
    body: {
      open: "Escaneie o código com sua carteira ou abra o link neste dispositivo.",
      processing: "O pagamento foi enviado. Aguardando a confirmação da rede.",
      paid: "O pagamento está confirmado.",
      failed: "O pagamento não foi concluído. Peça um novo link ao comerciante.",
      cancelled: "O comerciante cancelou este link de pagamento.",
      expired: "Este link de pagamento expirou. Peça um novo ao comerciante.",
    },
    qrAlt: "Código QR com esta solicitação de pagamento. Escaneie com sua carteira.",
    openWallet: "Abrir na carteira",
    network: "Rede",
    mainnet: "Mainnet",
    testnetTier: "Testnet",
    asset: "Ativo",
    expires: "Expira",
    notFoundTitle: "Link de pagamento não encontrado",
    notFoundBody: "Verifique o link ou peça ao comerciante que o envie novamente.",
    errorTitle: "Não conseguimos carregar este pagamento",
    errorBody: "Verifique sua conexão. Continuamos tentando.",
    rateLimited: "Muitas solicitações da sua rede. Tentaremos de novo em breve.",
    retry: "Tentar novamente",
  },
};

const fr: EmbedMessages = {
  button: {
    label: "Payer avec Cosmos Pay",
    newWindow: "S’ouvre dans une nouvelle fenêtre",
  },
  by: "Paiements par Cosmos Pay",
  demo: "Démo : un paiement d’exemple qui ne peut pas être réglé.",
  checkout: {
    eyebrow: "Demande de paiement",
    loading: "Chargement du paiement…",
    anyAmount: "Montant libre",
    anyAmountHint: "Vous choisissez le montant dans votre wallet.",
    testnet: "Réseau de test : aucun fonds réel n’est transféré",
    phase: {
      open: "En attente de paiement",
      processing: "Confirmation du paiement",
      paid: "Payé",
      failed: "Échec du paiement",
      cancelled: "Annulé",
      expired: "Expiré",
    },
    body: {
      open: "Scannez le code avec votre wallet, ou ouvrez le lien sur cet appareil.",
      processing: "Le paiement a été envoyé. En attente de la confirmation du réseau.",
      paid: "Le paiement est confirmé.",
      failed: "Le paiement n’a pas abouti. Demandez un nouveau lien au marchand.",
      cancelled: "Le marchand a annulé ce lien de paiement.",
      expired: "Ce lien de paiement a expiré. Demandez-en un nouveau au marchand.",
    },
    qrAlt: "Code QR contenant cette demande de paiement. Scannez-le avec votre wallet.",
    openWallet: "Ouvrir dans le wallet",
    network: "Réseau",
    mainnet: "Mainnet",
    testnetTier: "Testnet",
    asset: "Actif",
    expires: "Expire",
    notFoundTitle: "Lien de paiement introuvable",
    notFoundBody: "Vérifiez le lien, ou demandez au marchand de vous le renvoyer.",
    errorTitle: "Impossible de charger ce paiement",
    errorBody: "Vérifiez votre connexion. Nous réessayons.",
    rateLimited: "Trop de requêtes depuis votre réseau. Nouvel essai sous peu.",
    retry: "Réessayer",
  },
};

const de: EmbedMessages = {
  button: {
    label: "Mit Cosmos Pay bezahlen",
    newWindow: "Öffnet sich in einem neuen Fenster",
  },
  by: "Zahlungen von Cosmos Pay",
  demo: "Demo: eine Beispielzahlung, die nicht bezahlt werden kann.",
  checkout: {
    eyebrow: "Zahlungsanforderung",
    loading: "Zahlung wird geladen…",
    anyAmount: "Freier Betrag",
    anyAmountHint: "Du wählst den Betrag in deiner Wallet.",
    testnet: "Testnetz: Es werden keine echten Mittel bewegt",
    phase: {
      open: "Zahlung ausstehend",
      processing: "Zahlung wird bestätigt",
      paid: "Bezahlt",
      failed: "Zahlung fehlgeschlagen",
      cancelled: "Storniert",
      expired: "Abgelaufen",
    },
    body: {
      open: "Scanne den Code mit deiner Wallet oder öffne den Link auf diesem Gerät.",
      processing: "Die Zahlung wurde gesendet. Warte auf die Bestätigung des Netzwerks.",
      paid: "Die Zahlung ist bestätigt.",
      failed: "Die Zahlung ist nicht durchgegangen. Bitte den Händler um einen neuen Link.",
      cancelled: "Der Händler hat diesen Zahlungslink storniert.",
      expired: "Dieser Zahlungslink ist abgelaufen. Bitte den Händler um einen neuen.",
    },
    qrAlt: "QR-Code mit dieser Zahlungsanforderung. Scanne ihn mit deiner Wallet.",
    openWallet: "In der Wallet öffnen",
    network: "Netzwerk",
    mainnet: "Mainnet",
    testnetTier: "Testnet",
    asset: "Asset",
    expires: "Läuft ab",
    notFoundTitle: "Zahlungslink nicht gefunden",
    notFoundBody: "Prüfe den Link oder bitte den Händler, ihn erneut zu senden.",
    errorTitle: "Diese Zahlung konnte nicht geladen werden",
    errorBody: "Prüfe deine Verbindung. Wir versuchen es weiter.",
    rateLimited: "Zu viele Anfragen aus deinem Netzwerk. Gleich neuer Versuch.",
    retry: "Erneut versuchen",
  },
};

export const EMBED_MESSAGES: Record<EmbedLocale, EmbedMessages> = { en, es, pt, fr, de };

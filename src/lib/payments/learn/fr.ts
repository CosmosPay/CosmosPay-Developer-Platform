/* The gateway's guides in French. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const fr: LearnMessages = {
  hub: {
    nav: "Guides",
    title: "Guides des paiements en stablecoins",
    lede: "Des guides pour les entreprises qui encaissent en stablecoins avec Cosmos Pay : comment accepter l’USDC en ligne, comment envoyer un lien de paiement sur WhatsApp, ce que fait une passerelle de paiement en stablecoins et comment se comparent Stellar, Solana et Monad.",
    meta: "Guides des paiements en stablecoins | Cosmos Pay",
    description: "Guides pour entreprises : accepter l’USDC en ligne, liens de paiement sur WhatsApp, passerelle de paiement en stablecoins, Stellar vs Solana vs Monad.",
  },
  ui: {
    updated: "Mis à jour le {date}",
    by: "Par Cosmos Pay",
    related: "Guides associés",
    more: "Plus de guides",
    all: "Voir tous les guides",
  },
  guides: {
    acceptUsdc: {
      nav: "Accepter des paiements en USDC",
      title: "Comment accepter des paiements en USDC en ligne",
      meta: "Accepter des paiements en USDC en ligne | Cosmos Pay",
      description: "Acceptez l’USDC par lien de paiement, checkout hébergé ou API sur Stellar, Solana ou Monad : ce qu’il faut à vous et au client, et comment tester d’abord.",
      summary: "Encaissez en USDC avec un lien de paiement, le checkout hébergé ou l’API, et faites d’abord un essai sur un réseau de test.",
      lede: "Pour accepter l’USDC en ligne avec Cosmos Pay, ajoutez le wallet qui recevra l’argent, puis encaissez avec un lien de paiement, le checkout hébergé ou l’API de paiement. Votre client paie depuis son propre wallet sur Stellar, Solana ou Monad, et l’USDC arrive à votre adresse. Faites un essai sur un réseau de test avant d’encaisser de l’argent réel.",
      sections: {
        need: {
          title: "Ce qu’il vous faut",
          body: [
            "Un compte Cosmos Pay. Sa création est gratuite, et l’offre Starter n’a pas d’abonnement mensuel : chaque paiement coûte {starterRate}.",
            "Une adresse de wallet qui recevra l’USDC, sur le réseau où vous encaissez : Stellar, Solana ou Monad. Vous l’ajoutez à votre organisation dans le tableau de bord et prouvez qu’elle est à vous par une signature. Les liens de paiement créés dans le tableau de bord ne versent l’argent qu’aux wallets qui y sont ajoutés.",
          ],
          links: { fees: "Voir le tarif de chaque offre" },
        },
        payer: {
          title: "Ce qu’il faut à votre client",
          body: [
            "Un wallet sur le même réseau, qui détient l’USDC et peut ouvrir le paiement : sur Stellar, tout wallet qui ouvre les liens SEP-7 ; sur Solana, tout wallet qui lit les liens Solana Pay ; sur Monad, tout wallet EVM qui lit les liens EIP-681. Son wallet règle aussi les frais de réseau.",
            "Aucun compte. Votre client ouvre le checkout, scanne le QR code ou touche le bouton de son wallet, puis approuve le paiement dans son wallet.",
          ],
        },
        ways: {
          title: "Trois façons d’encaisser",
          body: ["Toutes les trois utilisent le même checkout, le même tableau de bord et les mêmes webhooks : vous pouvez commencer avec un lien et passer à l’API quand vous en avez besoin."],
          points: [
            "Lien de paiement : créez-le dans le tableau de bord et envoyez-le par chat ou par e-mail, ou montrez son QR code. Sans code.",
            "Checkout hébergé : envoyez votre client vers la page de paiement du lien, ouvrez-la depuis un bouton de paiement ou affichez-la dans votre page avec une seule balise script.",
            "API de paiement : créez chaque paiement depuis votre serveur avec une requête, ou avec le SDK TypeScript, et dessinez votre propre écran de paiement.",
          ],
          links: { whatsappGuide: "Envoyer un lien de paiement sur WhatsApp", integrations: "Essayer chaque option d’intégration", embed: "Intégrer un paiement" },
        },
        network: {
          title: "Sur quel réseau encaisser",
          body: [
            "Encaissez sur le réseau où vos clients détiennent déjà de l’USDC. L’USDC est préconfiguré sur Stellar et Solana, sur leurs réseaux principaux et de test, ainsi que sur le réseau principal de Monad. Sur les trois, tout autre jeton peut être encaissé en l’indiquant par son émetteur, son mint ou son contrat.",
          ],
          links: { networksGuide: "Stellar vs Solana vs Monad", stellar: "Paiements sur Stellar", solana: "Paiements sur Solana", monad: "Paiements sur Monad" },
        },
        cost: {
          title: "Ce que ça coûte",
          body: [
            "Chaque paiement paie le tarif de votre offre, le même sur chaque réseau : {starterRate} avec Starter, sans abonnement mensuel. Le wallet du payeur règle les frais de réseau ; sur Monad, le relais qui vous transfère le paiement en déduit ses frais.",
          ],
          links: { fees: "Tarifs et calculateur de frais", compare: "Nos frais comparés" },
        },
      },
      steps: {
        title: "Acceptez votre premier paiement en USDC, étape par étape",
        items: {
          sandbox: { title: "Créez votre compte et passez en Sandbox", body: "Connectez-vous au tableau de bord et choisissez Sandbox en haut. Ce que vous y créez fonctionne sur les réseaux de test (Stellar Testnet, Solana Devnet et Monad Testnet) et ne déplace aucun argent réel." },
          wallet: { title: "Ajoutez le wallet qui reçoit l’argent", body: "Dans les paramètres de votre organisation, ajoutez un wallet sur le réseau où vous encaisserez, puis signez ce que le tableau de bord demande pour prouver que ce wallet est à vous." },
          charge: { title: "Créez un paiement de test", body: "Dans Paiements, créez un lien de paiement avec le réseau, le montant, l’actif et le wallet qui le reçoit. Ou créez une clé d’API de test (elle commence par dv_) et appelez POST /v1/payment-intents/pay depuis votre serveur. Sur Stellar Testnet, vous pouvez encaisser en XLM, que Friendbot, le faucet de Testnet, envoie à un compte de test." },
          pay: { title: "Payez-le depuis un wallet de test", body: "Ouvrez la page de paiement : elle indique qu’elle fonctionne sur un réseau de test. Payez depuis un wallet sur ce réseau, puis regardez le checkout passer à Payé et le lien à Réussi dans le tableau de bord." },
          confirm: { title: "Confirmez les paiements sur votre serveur", body: "Ajoutez un endpoint webhook dans le tableau de bord. Quand le réseau confirme un paiement, Cosmos Pay envoie PAYMENT_INTENT_SUCCEEDED, signé en HMAC-SHA256. Livrez la commande quand cet événement arrive, pas quand la page du client affiche qu’elle est payée." },
          live: { title: "Passez en Production", body: "Choisissez Production dans le tableau de bord et créez une clé d’API de production (elle commence par prod_). Les mêmes requêtes encaissent alors sur les réseaux principaux : la clé choisit le réseau, pas le code." },
        },
        links: { gettingStarted: "Premiers pas", apiKeys: "Clés d’API", webhooks: "Webhooks", paymentIntents: "API des intentions de paiement" },
      },
      faq: {
        nocode: { q: "Puis-je accepter l’USDC sans écrire de code ?", a: "Oui. Créez un lien de paiement dans le tableau de bord et partagez-le par chat ou par e-mail, ou montrez son QR code. Le statut de chaque paiement s’affiche dans le tableau de bord." },
        asset: { q: "Mon client paie-t-il en USDC, et est-ce que je reçois de l’USDC ?", a: "Oui. Votre client paie dans l’actif défini sur le lien, et ce même actif arrive à votre adresse." },
        test: { q: "Puis-je essayer sans argent réel ?", a: "Oui. En Sandbox et avec des clés de test (dv_), les liens fonctionnent sur des réseaux de test, et leur checkout indique qu’aucun fonds réel ne circule." },
        refunds: { q: "Un client peut-il annuler un paiement en USDC ?", a: "Non. Une fois le paiement confirmé par le réseau, il est définitif. Un remboursement est un nouveau paiement que vous envoyez depuis votre wallet." },
      },
    },
    whatsapp: {
      nav: "Liens de paiement sur WhatsApp",
      title: "Comment envoyer un lien de paiement sur WhatsApp",
      meta: "Lien de paiement WhatsApp : créer et partager | Cosmos Pay",
      description: "Créez un lien de paiement en stablecoins dans le tableau de bord Cosmos Pay, envoyez-le sur WhatsApp ou en QR code imprimé et voyez quand il est payé.",
      summary: "Créez un lien dans le tableau de bord, envoyez-le dans une conversation ou imprimez son QR code, et voyez quand il est payé.",
      lede: "Créez un lien de paiement dans le tableau de bord Cosmos Pay, copiez l’adresse de sa page de paiement et collez-la dans la conversation WhatsApp. Votre client l’ouvre et paie depuis son propre wallet sur Stellar, Solana ou Monad, et le lien passe à Réussi dans votre tableau de bord dès que le réseau confirme le paiement.",
      sections: {
        before: {
          title: "Avant de commencer",
          body: [
            "Dans le tableau de bord, ajoutez le wallet qui recevra l’argent dans les paramètres de votre organisation, sur le réseau où vous encaisserez. Un lien de paiement ne verse l’argent qu’à l’un de ces wallets.",
            "Faites un essai en Sandbox : les liens y fonctionnent sur des réseaux de test, et leur checkout indique qu’aucun fonds réel ne circule.",
          ],
        },
        customer: {
          title: "Ce que voit votre client",
          body: [
            "La page de paiement affiche le montant, l’actif, le réseau et le temps restant pour payer. Votre client choisit comment payer : scanner le QR code avec une application de wallet, ouvrir le paiement dans un wallet sur le même appareil, ou l’envoyer à la main avec les détails affichés.",
            "La page s’ouvre dans la langue de son navigateur quand c’est l’une des sept que parle le checkout : anglais, espagnol, portugais, français, allemand, hindi et chinois. Elle passe à Payé dès que le réseau confirme le paiement et renvoie à la transaction dans un explorateur public. Votre client n’a besoin d’aucun compte.",
          ],
        },
        know: {
          title: "Bon à savoir",
          points: [
            "Un lien correspond à un paiement. Une fois payé, il ne peut pas l’être de nouveau : créez-en un par vente ou par facture.",
            "Un lien reste ouvert pendant une durée limitée, que le checkout affiche en compte à rebours. Ensuite, le checkout invite votre client à demander un nouveau lien ; un paiement qui arrive quand même et que le réseau confirme le marque comme payé.",
            "Sur Stellar et Solana, vous pouvez laisser le montant vide : votre client le choisit. Un lien Monad exige un montant.",
            "Chaque paiement paie le tarif de votre offre ({starterRate} avec Starter, sans abonnement mensuel). Le wallet de votre client règle les frais de réseau.",
          ],
          links: { acceptGuide: "Comment accepter des paiements en USDC en ligne", paymentLinks: "API des liens de paiement" },
        },
      },
      steps: {
        title: "Créer le lien et l’envoyer",
        items: {
          create: { title: "Créez le lien", body: "Dans le tableau de bord, ouvrez Paiements et cliquez sur Créer un lien de paiement. Indiquez le réseau, le montant et son actif, puis choisissez le wallet qui le reçoit et le design du checkout. Sur Stellar et Solana, vous pouvez ajouter un message que votre client voit dans son wallet." },
          copy: { title: "Copiez la page de paiement", body: "Quand le lien est prêt, copiez l’adresse de sa page de paiement : payments.cosmospay.lat suivi de l’id du lien. Elle s’ouvre dans n’importe quel navigateur, sur téléphone comme sur ordinateur." },
          send: { title: "Envoyez-le sur WhatsApp", body: "Collez l’adresse dans la conversation, avec l’objet du paiement. L’aperçu d’une messagerie affiche une carte générique de demande de paiement de Cosmos Pay, sans le montant ni votre adresse. L’e-mail, les SMS et toute autre messagerie fonctionnent de la même façon." },
          qr: { title: "Ou imprimez le QR code", body: "Le bouton Télécharger le QR enregistre le QR code du lien en image, le même que celui de la page de paiement. Votre client le scanne avec son application de wallet. Imprimez-le, ou affichez-le sur un écran, pour une vente en personne." },
          paid: { title: "Vérifiez qu’il est payé", body: "Dans le tableau de bord, la page du lien suit votre client : sur la page de paiement, portefeuille ouvert, paiement envoyé, payé. Une fois le paiement confirmé par le réseau, le lien affiche Réussi et, si vous avez ajouté un endpoint webhook, votre serveur reçoit PAYMENT_INTENT_SUCCEEDED." },
        },
        links: { webhooks: "Webhooks", linkDemo: "Essayer la démo des liens de paiement" },
      },
      faq: {
        account: { q: "Mon client a-t-il besoin d’un compte ?", a: "Non. Il lui faut un wallet sur le réseau du lien qui détient l’actif. Il ouvre le lien et approuve le paiement dans son wallet." },
        reuse: { q: "Puis-je envoyer le même lien à plusieurs clients ?", a: "Non. Un lien se paie une seule fois. Créez un nouveau lien pour chaque vente." },
        preview: { q: "L’aperçu WhatsApp affiche-t-il le montant ?", a: "Non. L’aperçu est la même carte générique de demande de paiement pour chaque lien. Votre client voit le montant en ouvrant la page de paiement." },
        expired: { q: "Et si mon client ouvre le lien après son expiration ?", a: "Le checkout indique que le lien a expiré et l’invite à en demander un nouveau. Créez un autre lien et envoyez-le." },
      },
    },
    gateway: {
      nav: "Passerelles de paiement en stablecoins",
      title: "Qu’est-ce qu’une passerelle de paiement en stablecoins ?",
      meta: "Passerelle de paiement en stablecoins expliquée | Cosmos Pay",
      description: "Ce que fait une passerelle de paiement en stablecoins, où va l’argent, qui paie les frais de réseau, dépositaire ou non, et comment fonctionne Cosmos Pay.",
      summary: "Ce que fait une passerelle, où l’argent est réglé, qui paie les frais de réseau, et la différence entre dépositaire et non dépositaire.",
      lede: "Une passerelle de paiement en stablecoins permet à une entreprise d’encaisser en stablecoins comme l’USDC. Elle crée la demande de paiement, montre au client comment payer depuis son propre wallet et prévient l’entreprise quand le réseau a confirmé le paiement. Certaines passerelles reçoivent l’argent et vous tiennent un solde ; une passerelle non dépositaire, comme Cosmos Pay, le fait verser sur une adresse que vous contrôlez.",
      sections: {
        stablecoin: {
          title: "Ce qu’est un stablecoin",
          body: [
            "Un stablecoin est un jeton conçu pour garder une valeur stable par rapport à une monnaie, le plus souvent le dollar américain. Il circule sur une blockchain comme n’importe quel autre jeton, d’un wallet à un autre, tous les jours et à toute heure.",
            "L’USDC et l’EURC en sont deux exemples, tous deux émis par Circle. Circle indique que l’USDC peut être échangé un pour un contre des dollars américains, et l’EURC un pour un contre des euros.",
          ],
          links: { circleUsdc: "L’USDC, sur le site de Circle", circleEurc: "L’EURC, sur le site de Circle" },
        },
        does: {
          title: "Ce que fait la passerelle",
          points: [
            "Elle crée la demande de paiement (le montant, l’actif, le réseau et l’adresse à payer) sous forme de lien et de QR code, dans le format que lisent les wallets : SEP-7 sur Stellar, Solana Pay sur Solana, EIP-681 sur les réseaux EVM comme Monad.",
            "Elle montre au client une page de paiement avec cette demande, pour qu’il paie depuis le wallet qu’il utilise déjà.",
            "Elle surveille le réseau et rattache chaque paiement à sa demande, par un mémo, une clé de référence ou une adresse créée pour ce paiement.",
            "Elle prévient l’entreprise dès que le réseau confirme le paiement, dans un tableau de bord et par un webhook signé envoyé à son serveur.",
          ],
          links: { sep7: "La norme SEP-7 (Stellar)", solanaPay: "La spécification Solana Pay", eip681: "La norme EIP-681 (Ethereum)" },
        },
        settle: {
          title: "Où l’argent est réglé",
          body: [
            "Le règlement est le moment où l’argent parvient à l’entreprise. Avec un stablecoin, il a lieu sur le réseau lui-même : une fois le transfert confirmé par le réseau, le paiement est définitif et ne peut pas faire l’objet d’une rétrofacturation. Un remboursement est un nouveau paiement envoyé par l’entreprise.",
          ],
        },
        fees: {
          title: "Qui paie les frais de réseau",
          body: [
            "Chaque transfert paie des frais au réseau sur lequel il passe. Avec Cosmos Pay, c’est le wallet du payeur qui les règle, sur Stellar, Solana et Monad. Sur Monad, chaque paiement va à une adresse créée pour lui, et le relais qui le transfère à l’entreprise prélève ses frais sur le paiement ; l’API les indique sur le paiement dans networkFee.",
            "Les frais de la passerelle elle-même sont à part. Cosmos Pay facture un tarif par paiement qui dépend de l’offre : {starterRate} avec Starter, sans abonnement mensuel.",
          ],
          links: { fees: "Tarifs et calculateur de frais" },
        },
        custody: {
          title: "Passerelles dépositaires et non dépositaires",
          body: [
            "Une passerelle dépositaire reçoit le paiement sur un compte qu’elle contrôle et vous affiche un solde, que vous retirez plus tard. Une passerelle non dépositaire ne détient jamais l’argent : le paiement va à une adresse dont vous détenez les clés.",
            "La différence tient à qui contrôle les fonds entre la vente et le moment où vous les utilisez, et à qui garde les clés. Avec une passerelle non dépositaire, vous les gardez, et c’est donc à vous d’en prendre soin.",
          ],
        },
        fit: {
          title: "Où se place Cosmos Pay",
          body: [
            "Cosmos Pay est une passerelle de paiement en stablecoins non dépositaire sur Stellar, Solana et Monad. Vous encaissez avec un lien de paiement, le checkout hébergé ou l’API de paiement, et vous choisissez les adresses de wallet qui reçoivent l’argent. Cosmos Pay ne stocke les clés de personne.",
            "Sur Stellar et Solana, votre client paie directement votre adresse. Sur Monad, chaque paiement va à une adresse de dépôt créée pour lui, qui ne peut que le transférer à votre adresse (moins les frais du relais) : Cosmos Pay n’en détient aucune clé. Chaque paiement peut être vérifié sur le réseau, et chaque checkout payé renvoie à sa transaction dans un explorateur public.",
          ],
          links: { security: "Comment les paiements sont protégés", acceptGuide: "Comment accepter des paiements en USDC en ligne", integrations: "Options d’intégration" },
        },
      },
      faq: {
        final: { q: "Un paiement en stablecoins peut-il faire l’objet d’une rétrofacturation ?", a: "Non. Une fois confirmé par le réseau, il est définitif. Un remboursement est un paiement que l’entreprise renvoie depuis son wallet." },
        custody: { q: "Cosmos Pay garde-t-il mon argent ?", a: "Non. Sur Stellar et Solana, le payeur paie directement votre adresse. Sur Monad, chaque paiement va à une adresse de dépôt créée pour lui, qui ne peut que le transférer à votre adresse (moins les frais du relais) : Cosmos Pay n’en détient aucune clé." },
        wallet: { q: "Ai-je besoin de mon propre wallet ?", a: "Oui. Les paiements vont à une adresse que vous contrôlez sur chaque réseau que vous acceptez : les fonds sont à vous dès le premier paiement." },
        customers: { q: "Mes clients ont-ils besoin d’un compte ?", a: "Pas de compte chez Cosmos Pay. Il leur faut un wallet sur le réseau du paiement qui détient le stablecoin." },
      },
    },
    networks: {
      nav: "Stellar vs Solana vs Monad",
      title: "Stellar vs Solana vs Monad pour accepter des paiements",
      meta: "Stellar vs Solana vs Monad pour les paiements | Cosmos Pay",
      description: "Stellar, Solana et Monad comparés pour accepter des paiements en stablecoins avec Cosmos Pay : standard de lien, actifs, réseaux de test, frais et tarifs.",
      summary: "Les trois réseaux côte à côte, tels que Cosmos Pay les prend en charge : format de lien, actifs, réseaux de test et frais.",
      lede: "Avec Cosmos Pay, un paiement sur Stellar, Solana ou Monad arrive à votre adresse et paie le même tarif, celui de votre offre. Ce qui change : le lien que lit le wallet (SEP-7 sur Stellar, Solana Pay sur Solana, EIP-681 vers une adresse de dépôt sur Monad), la façon dont un paiement est rattaché à son lien et les actifs préconfigurés. Le tableau les compare tels que Cosmos Pay les prend en charge.",
      table: {
        title: "Les trois réseaux côte à côte",
        caption: "Stellar, Solana et Monad comparés pour accepter des paiements avec Cosmos Pay",
        topic: "Critère",
        rows: {
          link: { k: "Lien de paiement", stellar: "SEP-7 (web+stellar:pay) et son QR code", solana: "Demande de transfert Solana Pay (solana:) et son QR code", monad: "EIP-681 (ethereum:) et son QR code, vers une adresse de dépôt créée pour ce paiement" },
          match: { k: "Comment un paiement est rattaché", stellar: "Un mémo numérique sur le lien", solana: "Une clé de référence Solana Pay sur le lien", monad: "Sa propre adresse de dépôt" },
          settle: { k: "Où va l’argent", stellar: "Directement à votre adresse", solana: "Directement à votre adresse", monad: "Une adresse de dépôt qui ne peut que le transférer à votre adresse" },
          fee: { k: "Frais de réseau", stellar: "Réglés par le wallet du payeur", solana: "Réglés par le wallet du payeur", monad: "Le wallet du payeur paie son transfert ; les frais du relais pour l’acheminement sont déduits du paiement" },
          presets: { k: "Actifs préconfigurés" },
          test: { k: "Réseau de test" },
          amount: { k: "Montant", stellar: "Fixe, ou choisi par le payeur", solana: "Fixe, ou choisi par le payeur", monad: "Obligatoire" },
          message: { k: "Message dans le wallet", stellar: "Oui", solana: "Oui", monad: "Non" },
          merchantFee: { k: "Vos propres frais sur un paiement", stellar: "Le payeur indique son compte et paie les deux en une seule transaction", solana: "Une demande de transaction Solana Pay avec les deux transferts", monad: "L’adresse de dépôt répartit le paiement" },
          wallets: { k: "Wallets qui paient", stellar: "Tout wallet qui ouvre les liens SEP-7, comme {wallets}", solana: "Tout wallet qui lit les liens Solana Pay, comme {wallets}", monad: "Tout wallet EVM qui lit les liens EIP-681" },
          private: { k: "Paiements privés", stellar: "Oui, sur Testnet pour l’instant", solana: "Non", monad: "Non" },
          rate: { k: "Tarif Cosmos Pay", value: "Le tarif de votre offre ({starterRate} avec Starter)" },
        },
        note: "Les actifs préconfigurés sont ceux que le tableau de bord propose par leur nom ; la page de chaque réseau donne leurs adresses. Tout autre jeton s’indique par son émetteur, son mint ou son contrat.",
        links: { sep7: "La norme SEP-7 (Stellar)", solanaPay: "La spécification Solana Pay", eip681: "La norme EIP-681 (Ethereum)" },
      },
      sections: {
        choose: {
          title: "Comment choisir",
          body: ["Un seul compte encaisse sur les trois réseaux, et chaque lien indique celui sur lequel il est réglé. Ces différences décident du réseau qui convient à un paiement :"],
          points: [
            "Encaissez là où vos clients détiennent déjà le stablecoin. Les mêmes clés d’API et les mêmes endpoints webhook servent pour les trois réseaux.",
            "Pour laisser le client choisir le montant, comme pour des dons, utilisez Stellar ou Solana : un lien Monad exige un montant.",
            "Pour afficher un message dans le wallet du client, comme un numéro de commande, utilisez Stellar ou Solana.",
            "Pour garder le montant privé on-chain, utilisez les paiements privés, qui fonctionnent sur Stellar, pour l’instant sur Testnet.",
          ],
          links: { stellar: "Paiements sur Stellar", solana: "Paiements sur Solana", monad: "Paiements sur Monad" },
        },
        fees: {
          title: "Ce que ça coûte sur chaque réseau",
          body: [
            "Cosmos Pay facture le tarif de votre offre par paiement, le même sur Stellar, Solana et Monad : {starterRate} avec Starter, sans abonnement mensuel. Le wallet du payeur règle les frais de réseau sur les trois. Sur Monad, le relais qui vous transfère le paiement en déduit ses frais, et le checkout les affiche.",
          ],
          links: { fees: "Tarifs et calculateur de frais", compare: "Nos frais comparés" },
        },
      },
      faq: {
        all: { q: "Puis-je accepter des paiements sur les trois réseaux ?", a: "Oui. Chaque lien de paiement est réglé sur un seul réseau, que vous choisissez en le créant. Le même compte, les mêmes clés d’API et les mêmes webhooks fonctionnent pour les trois." },
        test: { q: "Puis-je tester sur les trois ?", a: "Oui. En Sandbox, les clés de test (dv_) créent des liens sur Stellar Testnet, Solana Devnet et Monad Testnet. Monad Testnet n’a pas d’USDC préconfiguré : encaissez-y en MON, ou indiquez un jeton par son contrat." },
        fees: { q: "Cosmos Pay est-il moins cher sur un réseau ?", a: "Non. Le tarif de votre offre est le même sur les trois. Le wallet du payeur règle les frais de réseau, et sur Monad, le relais qui transfère un paiement en déduit ses frais." },
      },
    },
  },
};

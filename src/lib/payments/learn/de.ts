/* The gateway's guides in German. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const de: LearnMessages = {
  hub: {
    nav: "Anleitungen",
    title: "Anleitungen für Stablecoin-Zahlungen",
    lede: "Anleitungen für Unternehmen, die mit Cosmos Pay in Stablecoins kassieren: wie du USDC online oder mit Solana Pay annimmst, wie du einen Zahlungslink per WhatsApp sendest, wie du Zahlungen auf deinem Server bestätigst, was ein Stablecoin-Zahlungsgateway macht, wie sich Stellar, Solana und Monad unterscheiden und wie du USDT0 von Stellar an EVM-Netzwerke sendest.",
    meta: "Anleitungen für Stablecoin-Zahlungen | Cosmos Pay",
    description: "USDC online oder mit Solana Pay annehmen, Zahlungslinks per WhatsApp, Zahlungen per Webhook bestätigen, Stellar vs. Solana vs. Monad und USDT0 von Stellar.",
  },
  ui: {
    updated: "Aktualisiert am {date}",
    by: "Von Cosmos Pay",
    related: "Verwandte Anleitungen",
    more: "Weitere Anleitungen",
    all: "Alle Anleitungen ansehen",
  },
  guides: {
    acceptUsdc: {
      nav: "USDC-Zahlungen annehmen",
      title: "So nimmst du USDC-Zahlungen online an",
      meta: "USDC-Zahlungen online annehmen: so geht’s | Cosmos Pay",
      description: "USDC per Zahlungslink, gehostetem Checkout oder API auf Stellar, Solana oder Monad annehmen: was du und dein Kunde braucht und wie du vorher testest.",
      summary: "Kassiere in USDC mit einem Zahlungslink, dem gehosteten Checkout oder der API, und teste es zuerst in einem Testnetz.",
      lede: "Um mit Cosmos Pay online USDC anzunehmen, fügst du die Wallet hinzu, die das Geld empfängt, und kassierst dann mit einem Zahlungslink, dem gehosteten Checkout oder der Zahlungs-API. Dein Kunde zahlt aus seiner eigenen Wallet auf Stellar, Solana oder Monad, und die USDC gehen an deine Adresse. Teste alles in einem Testnetz, bevor du echtes Geld kassierst.",
      sections: {
        need: {
          title: "Was du brauchst",
          body: [
            "Ein Konto bei Cosmos Pay. Es zu erstellen ist kostenlos, und der Starter-Tarif hat keine Monatsgebühr: Jede Zahlung kostet {starterRate}.",
            "Eine Wallet-Adresse, die die USDC empfängt, in dem Netzwerk, in dem du kassierst: Stellar, Solana oder Monad. Du fügst sie im Dashboard deiner Organisation hinzu und beweist mit einer Signatur, dass sie dir gehört. Im Dashboard erstellte Zahlungslinks zahlen nur an die dort hinzugefügten Wallets.",
          ],
          links: { fees: "Die Sätze aller Tarife ansehen" },
        },
        payer: {
          title: "Was dein Kunde braucht",
          body: [
            "Eine Wallet im selben Netzwerk, die die USDC hält und die Zahlung öffnen kann: auf Stellar jede Wallet, die SEP-7-Links öffnet; auf Solana jede Wallet, die Solana-Pay-Links liest; auf Monad jede EVM-Wallet, die EIP-681-Links liest. Seine Wallet zahlt auch die Netzwerkgebühr.",
            "Kein Konto. Er öffnet den Checkout, scannt den QR-Code oder tippt auf den Wallet-Button und bestätigt die Zahlung in seiner Wallet.",
          ],
        },
        ways: {
          title: "Drei Wege zu kassieren",
          body: ["Alle drei nutzen denselben Checkout, dasselbe Dashboard und dieselben Webhooks. Du kannst also mit einem Link starten und zur API wechseln, wenn du sie brauchst."],
          points: [
            "Zahlungslink: Erstelle ihn im Dashboard und sende ihn per Chat oder E-Mail, oder zeige seinen QR-Code. Ohne Code.",
            "Gehosteter Checkout: Schicke deinen Kunden auf die Bezahlseite des Links, öffne sie über einen Bezahlbutton oder zeige sie mit einem einzigen Script-Tag in deiner Seite an.",
            "Zahlungs-API: Erstelle jede Zahlung von deinem Server aus mit einer Anfrage oder mit dem TypeScript-SDK und gestalte deinen eigenen Zahlungsbildschirm.",
          ],
          links: { whatsappGuide: "Einen Zahlungslink per WhatsApp senden", integrations: "Alle Integrationsoptionen ausprobieren", embed: "Eine Zahlung einbetten" },
        },
        network: {
          title: "In welchem Netzwerk du kassierst",
          body: [
            "Kassiere in dem Netzwerk, in dem deine Kunden schon USDC halten. USDC ist auf Stellar und Solana voreingestellt, jeweils im Mainnet und im Testnetz, und auf Monad im Mainnet. In allen drei kannst du auch in jedem anderen Token kassieren, den du über seinen Herausgeber, Mint oder Contract angibst.",
          ],
          links: { networksGuide: "Stellar vs. Solana vs. Monad", stellar: "Zahlungen auf Stellar", solana: "Zahlungen auf Solana", monad: "Zahlungen auf Monad" },
        },
        cost: {
          title: "Was es kostet",
          body: [
            "Jede Zahlung kostet den Satz deines Tarifs, der in jedem Netzwerk gleich ist: {starterRate} bei Starter, ohne Monatsgebühr. Die Wallet des Zahlers zahlt die Netzwerkgebühr; auf Monad zieht das Relay, das die Zahlung an dich weiterleitet, seine Gebühr von ihr ab.",
          ],
          links: { fees: "Preise und Gebührenrechner", compare: "Unsere Gebühren im Vergleich" },
        },
      },
      steps: {
        title: "Deine erste USDC-Zahlung annehmen, Schritt für Schritt",
        items: {
          sandbox: { title: "Erstelle dein Konto und wechsle in die Sandbox", body: "Melde dich im Dashboard an und wähle oben „Sandbox“. Was du dort erstellst, läuft in den Testnetzen (Stellar Testnet, Solana Devnet und Monad Testnet) und bewegt kein echtes Geld." },
          wallet: { title: "Füge die Wallet hinzu, die das Geld empfängt", body: "Füge in den Einstellungen deiner Organisation eine Wallet in dem Netzwerk hinzu, in dem du kassieren wirst, und signiere, was das Dashboard anfordert. Damit beweist du, dass die Wallet dir gehört." },
          charge: { title: "Erstelle eine Testzahlung", body: "Erstelle unter „Zahlungen“ einen Zahlungslink mit dem Netzwerk, dem Betrag, dem Asset und der Wallet, die die Zahlung empfängt. Oder erstelle einen Test-API-Schlüssel (er beginnt mit dv_) und rufe POST /v1/payment-intents/pay von deinem Server auf. Im Stellar Testnet kannst du in XLM kassieren, das Friendbot, der Faucet des Testnets, an ein Testkonto sendet." },
          pay: { title: "Bezahle sie aus einer Test-Wallet", body: "Öffne die Bezahlseite: Sie zeigt an, dass sie in einem Testnetz läuft. Zahle aus einer Wallet in diesem Netzwerk und sieh zu, wie der Checkout auf „Bezahlt“ und der Link im Dashboard auf „Erfolgreich“ springt." },
          confirm: { title: "Bestätige Zahlungen auf deinem Server", body: "Füge im Dashboard einen Webhook-Endpunkt hinzu. Wenn das Netzwerk eine Zahlung bestätigt, sendet Cosmos Pay PAYMENT_INTENT_SUCCEEDED, signiert mit HMAC-SHA256. Liefere die Bestellung aus, wenn dieses Ereignis ankommt, nicht schon, wenn die Seite des Kunden sie als bezahlt anzeigt." },
          live: { title: "Wechsle in die Produktion", body: "Wähle im Dashboard „Produktion“ und erstelle einen Produktions-API-Schlüssel (er beginnt mit prod_). Dieselben Anfragen kassieren jetzt in den Mainnets: Das Netzwerk bestimmt der Schlüssel, nicht der Code." },
        },
        links: { gettingStarted: "Erste Schritte", apiKeys: "API-Schlüssel", webhooks: "Webhooks", paymentIntents: "API für Zahlungsabsichten" },
      },
      faq: {
        nocode: { q: "Kann ich USDC annehmen, ohne Code zu schreiben?", a: "Ja. Erstelle im Dashboard einen Zahlungslink und teile ihn per Chat oder E-Mail, oder zeige seinen QR-Code. Den Status jeder Zahlung siehst du im Dashboard." },
        asset: { q: "Zahlt mein Kunde in USDC, und erhalte ich USDC?", a: "Ja. Dein Kunde zahlt in dem Asset, das auf dem Link festgelegt ist, und genau dieses Asset kommt an deiner Adresse an." },
        test: { q: "Kann ich es ohne echtes Geld ausprobieren?", a: "Ja. In der Sandbox und mit Testschlüsseln (dv_) laufen Links in Testnetzen, und ihr Checkout zeigt an, dass keine echten Mittel bewegt werden." },
        refunds: { q: "Kann ein Kunde eine USDC-Zahlung rückgängig machen?", a: "Nein. Sobald das Netzwerk eine Zahlung bestätigt, ist sie endgültig. Eine Erstattung ist eine neue Zahlung, die du aus deiner Wallet sendest." },
      },
    },
    whatsapp: {
      nav: "Zahlungslinks per WhatsApp",
      title: "So sendest du einen Zahlungslink per WhatsApp",
      meta: "Zahlungslinks per WhatsApp erstellen und teilen | Cosmos Pay",
      description: "Erstelle im Dashboard von Cosmos Pay einen Stablecoin-Zahlungslink, sende ihn per WhatsApp oder gedruckt als QR-Code und sieh sofort, wann er bezahlt ist.",
      summary: "Erstelle einen Link im Dashboard, sende ihn in einem Chat oder drucke seinen QR-Code, und sieh, wann er bezahlt ist.",
      lede: "Erstelle im Dashboard von Cosmos Pay einen Zahlungslink, kopiere die Adresse seiner Bezahlseite und füge sie in den WhatsApp-Chat ein. Dein Kunde öffnet sie und zahlt aus seiner eigenen Wallet auf Stellar, Solana oder Monad, und der Link springt in deinem Dashboard auf „Erfolgreich“, sobald das Netzwerk die Zahlung bestätigt.",
      sections: {
        before: {
          title: "Bevor du loslegst",
          body: [
            "Füge in den Einstellungen deiner Organisation im Dashboard eine Wallet für das Netzwerk hinzu, in dem du kassieren wirst. Sie empfängt das Geld. Ein Zahlungslink zahlt nur an eine dieser Wallets.",
            "Probiere es einmal in der Sandbox aus: Links laufen dort in Testnetzen, und ihr Checkout zeigt an, dass keine echten Mittel bewegt werden.",
          ],
        },
        customer: {
          title: "Was dein Kunde sieht",
          body: [
            "Die Bezahlseite zeigt den Betrag, das Asset, das Netzwerk und die verbleibende Zeit zum Bezahlen. Dein Kunde wählt, wie er zahlt: den QR-Code mit einer Wallet-App scannen, die Zahlung in einer Wallet auf demselben Gerät öffnen oder sie mit den angezeigten Daten von Hand senden.",
            "Die Seite öffnet sich in der Sprache seines Browsers, wenn es eine der sieben ist, die der Checkout spricht: Englisch, Spanisch, Portugiesisch, Französisch, Deutsch, Hindi und Chinesisch. Sobald das Netzwerk die Zahlung bestätigt, springt sie auf „Bezahlt“ und verlinkt die Transaktion in einem öffentlichen Explorer. Dein Kunde braucht kein Konto.",
          ],
        },
        know: {
          title: "Gut zu wissen",
          points: [
            "Ein Link ist eine Zahlung. Ist er bezahlt, kann er nicht noch einmal bezahlt werden. Erstelle also einen pro Verkauf oder Rechnung.",
            "Ein Link ist nur eine begrenzte Zeit offen, die der Checkout als Countdown zeigt. Danach bittet der Checkout deinen Kunden, einen neuen Link anzufordern; kommt trotzdem noch eine Zahlung an und wird bestätigt, gilt der Link als bezahlt.",
            "Auf Stellar und Solana kannst du den Betrag leer lassen, dann wählt ihn dein Kunde. Ein Monad-Link braucht einen Betrag.",
            "Jede Zahlung kostet den Satz deines Tarifs ({starterRate} bei Starter, ohne Monatsgebühr). Die Wallet deines Kunden zahlt die Netzwerkgebühr.",
          ],
          links: { acceptGuide: "So nimmst du USDC-Zahlungen online an", paymentLinks: "API für Zahlungslinks" },
        },
      },
      steps: {
        title: "Link erstellen und senden",
        items: {
          create: { title: "Erstelle den Link", body: "Öffne im Dashboard „Zahlungen“ und wähle „Zahlungslink erstellen“. Wähle das Netzwerk, den Betrag und sein Asset, dann die Wallet, die die Zahlung empfängt, und das Checkout-Design. Auf Stellar und Solana kannst du eine Nachricht hinzufügen, die dein Kunde in seiner Wallet sieht." },
          copy: { title: "Kopiere die Bezahlseite", body: "Wenn der Link fertig ist, kopiere die Adresse seiner Bezahlseite: payments.cosmospay.lat, gefolgt von der ID des Links. Sie öffnet sich in jedem Browser, auf dem Handy wie am Computer." },
          send: { title: "Sende ihn per WhatsApp", body: "Füge die Adresse in den Chat ein und schreib dazu, wofür die Zahlung ist. Die Vorschau einer Chat-App zeigt eine allgemeine Karte mit einer Zahlungsanforderung von Cosmos Pay. Weder der Betrag noch deine Adresse erscheinen darin. E-Mail, SMS und jede andere Chat-App funktionieren genauso." },
          qr: { title: "Oder drucke den QR-Code", body: "„QR herunterladen“ speichert den QR-Code des Links als Bild. Es ist derselbe Code, den die Bezahlseite zeigt. Dein Kunde scannt ihn mit seiner Wallet-App. Drucke ihn aus oder zeige ihn auf einem Bildschirm, wenn du vor Ort verkaufst." },
          paid: { title: "Sieh, dass bezahlt wurde", body: "Die Seite des Links im Dashboard folgt deinem Kunden: „Zahler auf der Zahlungsseite“, „Wallet geöffnet“, „Zahlung gesendet“, „Bezahlt“. Sobald das Netzwerk die Zahlung bestätigt, zeigt der Link „Erfolgreich“, und wenn du einen Webhook-Endpunkt hinzugefügt hast, erhält dein Server PAYMENT_INTENT_SUCCEEDED." },
        },
        links: { webhooks: "Webhooks", linkDemo: "Die Demo für Zahlungslinks ausprobieren" },
      },
      faq: {
        account: { q: "Braucht mein Kunde ein Konto?", a: "Nein. Er braucht eine Wallet im Netzwerk des Links, die das Asset hält. Er öffnet den Link und bestätigt die Zahlung in seiner Wallet." },
        reuse: { q: "Kann ich denselben Link an mehrere Kunden senden?", a: "Nein. Ein Link wird einmal bezahlt. Erstelle für jeden Verkauf einen neuen Link." },
        preview: { q: "Zeigt die WhatsApp-Vorschau den Betrag?", a: "Nein. Die Vorschau ist für jeden Link dieselbe allgemeine Karte mit einer Zahlungsanforderung. Den Betrag sieht dein Kunde, wenn er die Bezahlseite öffnet." },
        expired: { q: "Was passiert, wenn mein Kunde den Link nach Ablauf öffnet?", a: "Der Checkout zeigt an, dass der Link abgelaufen ist, und bittet ihn, einen neuen anzufordern. Erstelle einen weiteren Link und sende ihn." },
      },
    },
    gateway: {
      nav: "Stablecoin-Zahlungsgateways",
      title: "Was ist ein Stablecoin-Zahlungsgateway?",
      meta: "Was ist ein Stablecoin-Zahlungsgateway? | Cosmos Pay",
      description: "Was ein Stablecoin-Zahlungsgateway tut, wo das Geld ankommt, wer Netzwerkgebühren zahlt, verwahrend vs. nicht verwahrend und wie Cosmos Pay funktioniert.",
      summary: "Was ein Gateway macht, wo die Zahlung abgewickelt wird, wer die Netzwerkgebühr zahlt, und verwahrende gegenüber nicht verwahrenden Gateways.",
      lede: "Mit einem Stablecoin-Zahlungsgateway kassiert ein Unternehmen in Stablecoins wie USDC. Es erstellt die Zahlungsanforderung, zeigt dem Kunden, wie er aus seiner eigenen Wallet zahlt, und meldet dem Unternehmen, wenn das Netzwerk die Zahlung bestätigt hat. Manche Gateways empfangen das Geld und führen ein Guthaben für dich; ein nicht verwahrendes Gateway wie Cosmos Pay lässt es an eine Adresse zahlen, die du kontrollierst.",
      sections: {
        stablecoin: {
          title: "Was ein Stablecoin ist",
          body: [
            "Ein Stablecoin ist ein Token, der gegenüber einer Währung einen stabilen Wert halten soll, meist gegenüber dem US-Dollar. Er bewegt sich wie jeder andere Token auf einer Blockchain von einer Wallet zur anderen, an jedem Tag und zu jeder Stunde.",
            "USDC und EURC sind zwei davon, beide von Circle ausgegeben. Laut Circle lässt sich USDC eins zu eins in US-Dollar einlösen und EURC eins zu eins in Euro.",
          ],
          links: { circleUsdc: "USDC auf der Website von Circle", circleEurc: "EURC auf der Website von Circle" },
        },
        does: {
          title: "Was das Gateway macht",
          points: [
            "Es erstellt die Zahlungsanforderung (Betrag, Asset, Netzwerk und die zu zahlende Adresse) als Link und QR-Code in dem Format, das Wallets lesen: SEP-7 auf Stellar, Solana Pay auf Solana, EIP-681 auf EVM-Netzwerken wie Monad.",
            "Es zeigt dem Kunden eine Bezahlseite mit dieser Anforderung, damit er aus der Wallet zahlt, die er schon nutzt.",
            "Es beobachtet das Netzwerk und ordnet jede Zahlung über ein Memo, einen Referenzschlüssel oder eine eigens dafür angelegte Adresse ihrer Anforderung zu.",
            "Es meldet dem Unternehmen, sobald das Netzwerk die Zahlung bestätigt: im Dashboard und über einen signierten Webhook an seinen Server.",
          ],
          links: { sep7: "Der Standard SEP-7 (Stellar)", solanaPay: "Die Solana-Pay-Spezifikation", eip681: "Der Standard EIP-681 (Ethereum)" },
        },
        settle: {
          title: "Wo die Zahlung abgewickelt wird",
          body: [
            "Die Abwicklung ist der Moment, in dem das Geld beim Unternehmen ankommt. Bei einem Stablecoin geschieht sie im Netzwerk selbst: Sobald das Netzwerk die Überweisung bestätigt, ist die Zahlung endgültig und kann nicht zurückgebucht werden. Eine Erstattung ist eine neue Zahlung, die das Unternehmen sendet.",
          ],
        },
        fees: {
          title: "Wer die Netzwerkgebühr zahlt",
          body: [
            "Jede Überweisung zahlt eine Gebühr an das Netzwerk, auf dem sie läuft. Bei Cosmos Pay zahlt sie auf Stellar, Solana und Monad die Wallet des Zahlers. Auf Monad geht jede Zahlung an eine eigens dafür angelegte Adresse, und das Relay, das sie an das Unternehmen weiterleitet, zieht seine Gebühr von der Zahlung ab; die API gibt sie bei der Zahlung als networkFee an.",
            "Die Gebühr des Gateways selbst ist davon getrennt. Cosmos Pay berechnet pro Zahlung einen Satz, der vom Tarif abhängt: {starterRate} bei Starter, ohne Monatsgebühr.",
          ],
          links: { fees: "Preise und Gebührenrechner" },
        },
        custody: {
          title: "Verwahrende und nicht verwahrende Gateways",
          body: [
            "Ein verwahrendes Gateway empfängt die Zahlung auf einem Konto, das es kontrolliert, und zeigt dir ein Guthaben, das du später abhebst. Ein nicht verwahrendes Gateway hält das Geld nie: Die Zahlung geht an eine Adresse, deren Schlüssel du hältst.",
            "Der Unterschied liegt darin, wer die Mittel zwischen dem Verkauf und dem Moment kontrolliert, in dem du sie verwendest, und wer die Schlüssel hat. Bei einem nicht verwahrenden Gateway behältst du sie, also liegt es an dir, sie sicher aufzubewahren.",
          ],
        },
        fit: {
          title: "Wo Cosmos Pay steht",
          body: [
            "Cosmos Pay ist ein nicht verwahrendes Stablecoin-Zahlungsgateway auf Stellar, Solana und Monad. Du kassierst mit einem Zahlungslink, dem gehosteten Checkout oder der Zahlungs-API und wählst die Wallet-Adressen, die das Geld empfangen. Cosmos Pay speichert niemandes Schlüssel.",
            "Auf Stellar und Solana zahlt dein Kunde direkt an deine Adresse. Auf Monad geht jede Zahlung an eine eigens dafür erstellte Einzahlungsadresse, die sie nur an deine Adresse weiterleiten kann (abzüglich der Relay-Gebühr): Cosmos Pay hat keinen Schlüssel dazu. Jede Zahlung lässt sich im Netzwerk prüfen, und jeder bezahlte Checkout verlinkt seine Transaktion in einem öffentlichen Explorer.",
          ],
          links: { security: "So werden Zahlungen geschützt", acceptGuide: "So nimmst du USDC-Zahlungen online an", integrations: "Integrationsoptionen" },
        },
      },
      faq: {
        final: { q: "Kann eine Stablecoin-Zahlung zurückgebucht werden?", a: "Nein. Sobald das Netzwerk sie bestätigt, ist sie endgültig. Eine Erstattung ist eine Zahlung, die das Unternehmen aus seiner Wallet zurücksendet." },
        custody: { q: "Verwahrt Cosmos Pay mein Geld?", a: "Nein. Auf Stellar und Solana zahlt der Zahler direkt an deine Adresse. Auf Monad geht jede Zahlung an eine eigens dafür erstellte Einzahlungsadresse, die sie nur an deine Adresse weiterleiten kann (abzüglich der Relay-Gebühr): Cosmos Pay hat keinen Schlüssel dazu." },
        wallet: { q: "Brauche ich eine eigene Wallet?", a: "Ja. Zahlungen gehen in jedem Netzwerk, das du akzeptierst, an eine Adresse, die du kontrollierst, also gehört das Geld ab der ersten Zahlung dir." },
        customers: { q: "Brauchen meine Kunden ein Konto?", a: "Kein Konto bei Cosmos Pay. Sie brauchen eine Wallet im Netzwerk der Zahlung, die den Stablecoin hält." },
      },
    },
    networks: {
      nav: "Stellar vs. Solana vs. Monad",
      title: "Stellar vs. Solana vs. Monad für die Zahlungsannahme",
      meta: "Stellar vs. Solana vs. Monad für Zahlungen | Cosmos Pay",
      description: "Stellar, Solana und Monad im Vergleich für die Annahme von Stablecoin-Zahlungen mit Cosmos Pay: Link-Standard, Assets, Testnetze, Gebühren und Sätze.",
      summary: "Die drei Netzwerke nebeneinander, so wie Cosmos Pay sie unterstützt: Linkformat, Assets, Testnetze und Gebühren.",
      lede: "Mit Cosmos Pay erreicht eine Zahlung auf Stellar, Solana oder Monad deine Adresse und kostet denselben Satz deines Tarifs. Was sich ändert, ist der Link, den die Wallet liest (SEP-7 auf Stellar, Solana Pay auf Solana, EIP-681 an eine Einzahlungsadresse auf Monad), wie eine Zahlung ihrem Link zugeordnet wird und welche Assets voreingestellt sind. Die Tabelle vergleicht sie so, wie Cosmos Pay sie unterstützt.",
      table: {
        title: "Die drei Netzwerke nebeneinander",
        caption: "Stellar, Solana und Monad im Vergleich für die Annahme von Zahlungen mit Cosmos Pay",
        topic: "Thema",
        rows: {
          link: { k: "Zahlungslink", stellar: "SEP-7 (web+stellar:pay) und sein QR-Code", solana: "Solana-Pay-Überweisungsanfrage (solana:) und ihr QR-Code", monad: "EIP-681 (ethereum:) und sein QR-Code, an eine Einzahlungsadresse, die für diese Zahlung angelegt wird" },
          match: { k: "Wie eine Zahlung zugeordnet wird", stellar: "Ein numerisches Memo auf dem Link", solana: "Ein Solana-Pay-Referenzschlüssel auf dem Link", monad: "Ihre eigene Einzahlungsadresse" },
          settle: { k: "Wohin das Geld geht", stellar: "Direkt an deine Adresse", solana: "Direkt an deine Adresse", monad: "Eine Einzahlungsadresse, die es nur an deine Adresse weiterleiten kann" },
          fee: { k: "Netzwerkgebühr", stellar: "Zahlt die Wallet des Zahlers", solana: "Zahlt die Wallet des Zahlers", monad: "Die Wallet des Zahlers zahlt ihre Überweisung; die Relay-Gebühr für die Weiterleitung wird von der Zahlung abgezogen" },
          presets: { k: "Voreingestellte Assets" },
          test: { k: "Testnetz" },
          amount: { k: "Betrag", stellar: "Fest oder vom Zahler gewählt", solana: "Fest oder vom Zahler gewählt", monad: "Erforderlich" },
          message: { k: "Nachricht in der Wallet", stellar: "Ja", solana: "Ja", monad: "Nein" },
          merchantFee: { k: "Deine eigene Gebühr auf eine Zahlung", stellar: "Der Zahler gibt sein Konto an und zahlt beides in einer Transaktion", solana: "Eine Solana-Pay-Transaktionsanfrage mit beiden Überweisungen", monad: "Die Einzahlungsadresse teilt die Zahlung auf" },
          wallets: { k: "Wallets, die zahlen", stellar: "Jede Wallet, die SEP-7-Links öffnet, etwa {wallets}", solana: "Jede Wallet, die Solana-Pay-Links liest, etwa {wallets}", monad: "Jede EVM-Wallet, die EIP-681-Links liest" },
          private: { k: "Private Zahlungen", stellar: "Ja, vorerst im Testnet", solana: "Nein", monad: "Nein" },
          rate: { k: "Satz von Cosmos Pay", value: "Der Satz deines Tarifs ({starterRate} bei Starter)" },
        },
        note: "Voreingestellte Assets sind die, die das Dashboard mit Namen anbietet; die Seite jedes Netzwerks listet ihre Adressen. Jeden anderen Token gibst du über seinen Herausgeber, Mint oder Contract an.",
        links: { sep7: "Der Standard SEP-7 (Stellar)", solanaPay: "Die Solana-Pay-Spezifikation", eip681: "Der Standard EIP-681 (Ethereum)" },
      },
      sections: {
        choose: {
          title: "So wählst du",
          body: ["Ein Konto nimmt Zahlungen in allen drei Netzwerken an, und jeder Link nennt das Netzwerk, in dem er abgewickelt wird. Diese Unterschiede entscheiden, wo eine Zahlung hinpasst:"],
          points: [
            "Kassiere dort, wo deine Kunden den Stablecoin schon halten. Dieselben API-Schlüssel und Webhook-Endpunkte bedienen alle drei Netzwerke.",
            "Soll der Kunde den Betrag wählen, etwa bei Spenden, nutze Stellar oder Solana: Ein Monad-Link braucht einen Betrag.",
            "Um eine Nachricht in der Wallet des Kunden zu zeigen, etwa eine Bestellnummer, nutze Stellar oder Solana.",
            "Um den Betrag on-chain privat zu halten, gibt es private Zahlungen auf Stellar, vorerst im Testnet.",
          ],
          links: { stellar: "Zahlungen auf Stellar", solana: "Zahlungen auf Solana", monad: "Zahlungen auf Monad" },
        },
        fees: {
          title: "Was es in jedem Netzwerk kostet",
          body: [
            "Cosmos Pay berechnet pro Zahlung den Satz deines Tarifs, der auf Stellar, Solana und Monad gleich ist: {starterRate} bei Starter, ohne Monatsgebühr. In allen drei zahlt die Wallet des Zahlers die Netzwerkgebühr. Auf Monad zieht das Relay seine Gebühr für die Weiterleitung an dich von der Zahlung ab, und der Checkout zeigt sie an.",
          ],
          links: { fees: "Preise und Gebührenrechner", compare: "Unsere Gebühren im Vergleich" },
        },
      },
      faq: {
        all: { q: "Kann ich Zahlungen in allen drei Netzwerken annehmen?", a: "Ja. Jeder Zahlungslink wird in einem Netzwerk abgewickelt, das du beim Erstellen wählst. Dasselbe Konto, dieselben API-Schlüssel und dieselben Webhooks funktionieren für alle drei." },
        test: { q: "Kann ich in allen drei testen?", a: "Ja. Die Sandbox und Testschlüssel (dv_) erstellen Links im Stellar Testnet, im Solana Devnet und im Monad Testnet. Im Monad Testnet ist kein USDC voreingestellt: Kassiere dort in MON oder gib einen Token über seinen Contract an." },
        fees: { q: "Ist Cosmos Pay in einem Netzwerk günstiger?", a: "Nein. Der Satz deines Tarifs ist in allen drei gleich. Die Wallet des Zahlers zahlt die Netzwerkgebühr, und auf Monad zieht das Relay seine Gebühr für die Weiterleitung von der Zahlung ab." },
      },
    },
    solanaPay: {
      nav: "USDC mit Solana Pay",
      title: "So nimmst du USDC mit Solana-Pay-Links an",
      meta: "Solana-Pay-Zahlungslinks Schritt für Schritt | Cosmos Pay",
      description: "Kassiere USDC auf Solana mit einem Solana-Pay-Link und QR-Code: was der Link enthält, wie du im Devnet testest und wie jede Zahlung bestätigt wird.",
      summary: "Erstelle einen Solana-Pay-Link für USDC, teste ihn im Devnet und sieh, wie jede Zahlung auf deinem Server bestätigt wird.",
      lede: "Mit Cosmos Pay ist ein Zahlungslink auf Solana eine Solana-Pay-Überweisungsanfrage: Dein Kunde scannt ihren QR-Code oder öffnet sie in einer Wallet wie Phantom oder Solflare und bestätigt dort die USDC-Zahlung. Die USDC gehen direkt an deine Wallet, und Cosmos Pay markiert den Link als bezahlt, sobald Solana die Transaktion bestätigt. Teste es im Devnet, bevor du echtes Geld kassierst.",
      sections: {
        what: {
          title: "Was ein Solana-Pay-Link enthält",
          body: [
            "Solana Pay ist ein Standard für Zahlungsanforderungen, die Solana-Wallets lesen: ein solana:-Link oder sein QR-Code mit der zu zahlenden Adresse, dem Betrag, dem Token und einer Nachricht.",
            "Cosmos Pay fügt einen Referenzschlüssel hinzu, der für jeden Link angelegt wird. Die Wallet nimmt ihn in die Transaktion auf, und Cosmos Pay sucht auf Solana nach diesem Schlüssel, um die Zahlung ihrem Link zuzuordnen. Cosmos Pay akzeptiert die Zahlung nur, wenn die Transaktion erfolgreich war und genau der Betrag an deiner Adresse angekommen ist.",
          ],
          links: { solanaPay: "Die Solana-Pay-Spezifikation", solana: "Zahlungen auf Solana" },
        },
        need: {
          title: "Was du und dein Kunde braucht",
          points: [
            "Du: eine Solana-Adresse, die das Geld empfängt, im Dashboard deiner Organisation hinzugefügt und mit einer Signatur als deine nachgewiesen.",
            "Dein Kunde: eine Solana-Wallet, die Solana-Pay-Links liest, etwa Phantom oder Solflare, mit den USDC und etwas SOL für die Netzwerkgebühr. Kein Konto bei Cosmos Pay.",
            "Für Tests: die Sandbox, in der Links im Solana Devnet laufen. Auch dort ist USDC voreingestellt, du kannst also mit Devnet-USDC testen.",
          ],
        },
        api: {
          title: "Den Link von deinem Server aus erstellen",
          body: [
            "Rufe mit der Zahlungs-API POST /v1/payment-intents/pay auf, mit chain auf solana, deiner Adresse als Ziel und, für USDC, dem Asset-Code USDC mit seinem Mint als Herausgeber. Mit dem TypeScript-SDK (Version 2.2 oder neuer) übergibst du chain: 'solana' an client.paymentIntents.createPay.",
            "Die Antwort enthält den Link (seine uri beginnt mit solana:) und seinen QR-Code. Zeige den QR-Code, öffne den Link in der Wallet deines Kunden oder schicke ihn zum gehosteten Checkout: payments.cosmospay.lat, gefolgt von der ID des Links.",
          ],
          links: { paymentIntents: "API für Zahlungsabsichten", sdkPaymentIntents: "Zahlungsabsichten im SDK" },
        },
        know: {
          title: "Gut zu wissen",
          points: [
            "Du kannst den Betrag leer lassen und ihn deinen Kunden wählen lassen, etwa bei Spenden. Ein Link, der deine eigene Gebühr hinzufügt, braucht einen Betrag.",
            "Eine Nachricht mit bis zu 300 Zeichen, etwa eine Bestellnummer, erscheint in der Wallet deines Kunden.",
            "Mit deiner eigenen Gebühr auf der Zahlung wird der Link zu einer Solana-Pay-Transaktionsanfrage, die deine Wallet und deine Gebühren-Wallet in einer Transaktion bezahlt.",
            "Ein Link ist nur eine begrenzte Zeit offen, die der Checkout als Countdown zeigt. Kommt trotzdem noch eine Zahlung an und wird bestätigt, gilt er als bezahlt.",
            "Die Wallet deines Kunden zahlt die Netzwerkgebühr von Solana in SOL. Jede Zahlung kostet den Satz deines Tarifs, wie in jedem Netzwerk.",
          ],
          links: { fees: "Preise und Gebührenrechner", networksGuide: "Stellar vs. Solana vs. Monad" },
        },
      },
      steps: {
        title: "Deine erste Solana-Pay-Zahlung annehmen",
        items: {
          sandbox: { title: "Wechsle in die Sandbox", body: "Melde dich im Dashboard an und wähle oben „Sandbox“. Links, die du dort erstellst, laufen im Solana Devnet und bewegen kein echtes Geld." },
          wallet: { title: "Füge deine Solana-Wallet hinzu", body: "Füge in den Einstellungen deiner Organisation die Solana-Adresse hinzu, die das Geld empfängt, und signiere, was das Dashboard anfordert. Damit beweist du, dass die Wallet dir gehört." },
          create: { title: "Erstelle den Link", body: "Wähle unter „Zahlungen“ „Zahlungslink erstellen“, dann Solana, und stelle das Asset auf USDC um (die Auswahl beginnt bei SOL). Gib den Betrag ein oder lass ihn leer, damit dein Kunde ihn bestimmt, und wähle dann deine Wallet und, wenn du möchtest, eine Nachricht." },
          pay: { title: "Bezahle ihn aus einer Wallet", body: "Öffne die Bezahlseite und scanne ihren QR-Code mit einer Solana-Wallet oder öffne den Link auf demselben Gerät. Bestätige die Zahlung in der Wallet, und der Checkout springt auf „Bezahlt“, sobald Solana sie bestätigt." },
          confirm: { title: "Bestätige sie auf deinem Server", body: "Füge im Dashboard einen Webhook-Endpunkt hinzu. Wenn die Zahlung bestätigt ist, sendet Cosmos Pay PAYMENT_INTENT_SUCCEEDED, signiert mit HMAC-SHA256. Liefere die Bestellung aus, wenn dieses Ereignis ankommt." },
          live: { title: "Wechsle in die Produktion", body: "Wähle „Produktion“ und erstelle einen Produktions-API-Schlüssel (er beginnt mit prod_). Links laufen jetzt im Mainnet von Solana, wo USDC eine eigene Voreinstellung hat." },
        },
        links: { webhooksGuide: "So bestätigst du eine Zahlung auf deinem Server", apiKeys: "API-Schlüssel" },
      },
      faq: {
        wallets: { q: "Welche Wallets können einen Solana-Pay-Link bezahlen?", a: "Jede Solana-Wallet, die Solana-Pay-Links liest, etwa Phantom oder Solflare. Dein Kunde scannt den QR-Code oder öffnet den Link und bestätigt die Zahlung in der Wallet." },
        sol: { q: "Braucht mein Kunde SOL?", a: "Ja, ein wenig. Seine Wallet zahlt die Netzwerkgebühr von Solana in SOL, zusätzlich zu den USDC, die er sendet." },
        direct: { q: "Laufen die USDC über Cosmos Pay?", a: "Nein. Auf Solana sendet die Wallet deines Kunden die USDC direkt an deine Adresse. Cosmos Pay findet die Zahlung im Netzwerk über den Referenzschlüssel des Links." },
        devnet: { q: "Kann ich ohne echtes Geld testen?", a: "Ja. In der Sandbox und mit Testschlüsseln (dv_) laufen Links im Solana Devnet, wo USDC voreingestellt ist, und der Checkout zeigt an, dass keine echten Mittel bewegt werden." },
      },
    },
    webhooks: {
      nav: "Zahlungen auf dem Server bestätigen",
      title: "So bestätigst du eine Stablecoin-Zahlung auf deinem Server",
      meta: "Stablecoin-Zahlungen per Webhook bestätigen | Cosmos Pay",
      description: "Stablecoin-Zahlungen per signiertem Webhook auf dem Server bestätigen: Signatur prüfen, schnell antworten, Retries und Duplikate behandeln, vorab testen.",
      summary: "Liefere Bestellungen aufgrund eines signierten Webhooks aus, nicht aufgrund der Seite deines Kunden: Prüfe ihn, antworte schnell und überspringe Duplikate.",
      lede: "Um eine Stablecoin-Zahlung zu bestätigen, lass deinen Server auf den signierten Webhook von Cosmos Pay reagieren, nicht auf die Seite, die dein Kunde sieht. Wenn das Netzwerk eine Zahlung bestätigt, sendet Cosmos Pay PAYMENT_INTENT_SUCCEEDED an deinen Endpunkt, signiert mit dem Geheimnis dieses Endpunkts. Prüfe die Signatur, antworte mit einem 2xx-Status und liefere die Bestellung einmal pro Ereignis aus.",
      sections: {
        why: {
          title: "Warum dein Server und nicht der Browser",
          body: [
            "Ein Checkout, der „Bezahlt“ zeigt, ist nur das, was der Browser deines Kunden anzeigt. Der Tab kann sich schließen, bevor er zu deiner Website zurückkehrt, und jeder kann deine Erfolgsseite von Hand öffnen. Erst die Bestätigung des Netzwerks macht eine Zahlung endgültig.",
            "Cosmos Pay beobachtet das Netzwerk für dich und meldet deinem Server, wenn eine Zahlung bestätigt ist. Auf deinem Server markierst du die Bestellung als bezahlt und lieferst sie aus.",
          ],
        },
        how: {
          title: "Was Cosmos Pay sendet",
          points: [
            "Einen HTTPS-POST an den Endpunkt, den du registrierst, mit einem JSON-Ereignis: id (sie beginnt mit evt_), type, createdAt und data. Bei einer Zahlung ist data die Zahlung mit ihrem Status, Betrag, Asset, Netzwerk und ihrer Transaktion.",
            "Den Header X-Cosmos-Signature: t=<Unix-Zeit>,v1=<Signatur>. Die Signatur ist der HMAC-SHA256 aus t, einem Punkt und dem unverarbeiteten Body, mit dem Geheimnis des Endpunkts als Schlüssel, in hexadezimaler Form.",
            "Die Ereignistypen, die du wählst, etwa PAYMENT_INTENT_SUCCEEDED, PAYMENT_INTENT_FAILED oder ZK_PAYMENT_SUCCEEDED. Vergleiche sie so, wie sie geschrieben sind: in Großbuchstaben mit Unterstrichen.",
            "Die Header X-Cosmos-Event, X-Cosmos-Event-Id und X-Cosmos-Delivery, die das Ereignis und die Zustellung benennen.",
          ],
          links: { webhooks: "Webhooks im SDK", webhooksApi: "API für Webhooks" },
        },
        retries: {
          title: "Wenn dein Server nicht antwortet",
          body: [
            "Nur eine 2xx-Antwort gilt als zugestellt, und Weiterleitungen werden nicht verfolgt. Cosmos Pay wiederholt eine fehlgeschlagene Zustellung bis zu dreimal mit wachsender Pause, dann erneut in späteren Runden, und das Ereignis behält bei jedem Versuch seine ID.",
            "Im Dashboard listet jeder Endpunkt seine Zustellungen auf, mit einem Filter für die fehlgeschlagenen, und du kannst jede davon erneut senden. Cosmos Pay bewahrt den Body einer Zustellung 30 Tage lang auf, stelle sie also innerhalb dieser Zeit erneut zu.",
          ],
        },
        validate: {
          title: "Oder prüfe eine Zahlung selbst",
          body: [
            "Du kannst auch nach einer einzelnen Zahlung fragen: Rufe sie über ihre ID ab, um ihren Status zu lesen, oder sende ihren Transaktions-Hash (auf Solana die Transaktionssignatur) an POST /v1/payment-intents/:id/validate. Nutze das als Fallback, etwa wenn dein Kunde zurückkehrt, bevor der Webhook ankommt; der Webhook bleibt das wichtigste Signal.",
          ],
          links: { paymentIntents: "API für Zahlungsabsichten" },
        },
      },
      steps: {
        title: "Einen Webhook einrichten, Schritt für Schritt",
        items: {
          endpoint: { title: "Füge einen Endpunkt hinzu", body: "Öffne im Dashboard „Webhooks“ und füge die HTTPS-Adresse einer Route auf deinem Server hinzu. Wähle die Ereignisse, die du empfangen willst; PAYMENT_INTENT_SUCCEEDED ist schon ausgewählt. Die Adresse muss öffentlich sein: Private und lokale Adressen werden abgelehnt." },
          secret: { title: "Speichere das Geheimnis", body: "Das Dashboard zeigt das Geheimnis des Endpunkts (es beginnt mit whsec_) nur einmal. Bewahre es in der Umgebung deines Servers auf, niemals in einer Webseite." },
          verify: { title: "Prüfe jede Anfrage", body: "Lies den unverarbeiteten Body vor jedem JSON-Parser und prüfe X-Cosmos-Signature dagegen. Mit dem TypeScript-SDK prüft Webhooks.constructEvent die Signatur, lehnt standardmäßig eine ab, die älter als fünf Minuten ist, und gibt das Ereignis zurück." },
          answer: { title: "Erst schnell antworten, dann arbeiten", body: "Antworte mit einem 2xx-Status, sobald die Signatur stimmt, und erledige die langsame Arbeit, etwa E-Mails oder Bestandsaktualisierungen, erst danach." },
          dedupe: { title: "Verarbeite jedes Ereignis einmal", body: "Speichere die ID jedes Ereignisses, das du verarbeitest, und überspringe eines, das du schon gesehen hast: Eine Wiederholung oder eine erneute Zustellung sendet dasselbe Ereignis noch einmal." },
          test: { title: "Sende einen Test", body: "Nutze „Test senden“ am Endpunkt, um ein Ping-Ereignis zu erhalten. Mache dann eine Testzahlung in der Sandbox und verfolge ihre Zustellung in der Liste des Endpunkts." },
        },
        links: { webhooks: "Webhooks im SDK", gettingStarted: "Erste Schritte" },
      },
      faq: {
        name: { q: "Das Dashboard zeigt payment_intent.succeeded. Welchen Namen trägt das Ereignis?", a: "Der Typ des Ereignisses ist PAYMENT_INTENT_SUCCEEDED, in Großbuchstaben mit Unterstrichen. Das Dashboard zeigt ihn nur in einer kürzeren Form an." },
        rotate: { q: "Was passiert, wenn ich das Geheimnis erneuere?", a: "Das neue Geheimnis gilt sofort, und das alte gilt sofort nicht mehr. Aktualisiere deinen Server also direkt nach dem Erneuern." },
        down: { q: "Was ist, wenn mein Server ausgefallen war?", a: "Cosmos Pay wiederholt fehlgeschlagene Zustellungen, und du kannst jede Zustellung 30 Tage lang aus dem Dashboard erneut senden." },
        several: { q: "Kann ich mehrere Endpunkte haben?", a: "Ja. Jeder Endpunkt hat seine eigene Adresse, seine eigenen Ereignisse und sein eigenes Geheimnis, und jedes Ereignis geht an jeden Endpunkt, der es abonniert." },
      },
    },
    usdt0: {
      nav: "USDT0 von Stellar",
      title: "So sendest du USDT0 von Stellar an EVM-Netzwerke",
      meta: "USDT0 von Stellar an EVM-Netzwerke senden | Cosmos Pay",
      description: "Sende USDT0 mit Cosmos Pay von einem Stellar-Konto an Ethereum, Arbitrum und andere EVM-Netzwerke: Routen, Gebühren in XLM, Dauer und jeder Schritt.",
      summary: "Bewege USDT0 über LayerZero von Stellar in ein EVM-Netzwerk: Wähle eine Route, sieh die Gebühren, signiere einmal und verfolge die Zustellung.",
      lede: "Mit Cosmos Pay kannst du USDT0 von einem Stellar-Konto an eine Adresse auf Ethereum, Arbitrum oder einem anderen von 21 EVM-Netzwerken senden. Du erhältst ein Angebot mit jeder Gebühr in XLM, signierst eine Stellar-Transaktion in deiner Wallet, und die Überweisung kommt in etwa 27 Minuten an. Ethereum erhält natives USDT; jedes andere Netzwerk erhält USDT0.",
      sections: {
        what: {
          title: "Was USDT0 ist",
          body: [
            "USDT0 ist die Omnichain-Form von Tethers USDT. Sein Herausgeber beschreibt ein Lock-and-Mint-Design: USDT wird auf Ethereum gesperrt und dieselbe Menge USDT0 auf den anderen Netzwerken geprägt, die es mit dem Omnichain-Fungible-Token-Standard (OFT) von LayerZero untereinander bewegen.",
            "Auf Stellar ist USDT0 ein Asset wie jedes andere, also braucht das sendende Konto eine Trustline dafür und ein USDT0-Guthaben.",
          ],
          links: { usdt0Site: "USDT0 auf der Website seines Herausgebers", usdt0Network: "So funktioniert das USDT0-Netzwerk", layerzeroOft: "Der OFT-Standard von LayerZero" },
        },
        routes: {
          title: "Wohin es gehen kann",
          body: [
            "Cosmos Pay bietet 21 Routen an, alle zu EVM-Netzwerken, jede an eine Adresse aus 0x und 40 Hexadezimalzeichen. Ethereum erhält natives USDT; Arbitrum und die anderen erhalten USDT0. Der routes-Aufruf der API listet sie mit ihren Namen.",
            "Überweisungen laufen nur in den Mainnets: Mit einem Testschlüssel (dv_) antwortet die API, dass keine Route verfügbar ist.",
          ],
          links: { usdt0Docs: "USDT0 im SDK", usdt0Api: "API für USDT0" },
        },
        cost: {
          title: "Was es kostet",
          points: [
            "Die Messaging-Gebühr von LayerZero, in XLM. Die Transaktion erlaubt bis zu 20% mehr, und was sie nicht verbraucht, kommt in derselben Transaktion zurück.",
            "Die Netzwerkgebühr von Stellar, in XLM.",
            "Eine etwaige Provision von Cosmos Pay, die das Angebot zeigt, bevor du signierst.",
            "Das sendende Konto zahlt alles in XLM, halte dort also neben den USDT0 etwas XLM bereit.",
          ],
        },
        know: {
          title: "Gut zu wissen",
          points: [
            "Die Transaktion hat eine kurze Frist, angegeben als expiresAt: Signiere und übermittle sie vorher, oder erstelle eine neue Überweisung.",
            "Stellar-Beträge haben 7 Dezimalstellen und der OFT überträgt 6, also bleibt eine 7. Dezimalstelle als Staub auf deinem Konto.",
            "Cosmos Pay hält nie einen Schlüssel: Die API baut die Transaktion, deine Wallet signiert sie und die API leitet sie weiter.",
            "Du kannst USDT0 auch über den Swap-Bereich des Dashboards senden, wo es als „USDT0-Brücke“ erscheint.",
          ],
        },
      },
      steps: {
        title: "USDT0 senden, Schritt für Schritt",
        items: {
          hold: { title: "Halte USDT0 auf Stellar", body: "Das sendende Konto braucht eine Trustline für USDT0, ein USDT0-Guthaben und etwas XLM für die Gebühren." },
          quote: { title: "Hol dir ein Angebot", body: "Rufe quote mit der Route und dem Betrag auf. Es gibt zurück, was gesendet wird, was ankommt, den verbleibenden Staub, jede Gebühr und die Limits, und speichert nichts." },
          create: { title: "Erstelle die Überweisung", body: "Rufe create mit dem sendenden Stellar-Konto, der Route, der empfangenden EVM-Adresse und dem Betrag auf. Die API baut dafür eine Stellar-Transaktion." },
          sign: { title: "Signiere sie in deiner Wallet", body: "Signiere die Transaktion (ihr XDR) mit der Wallet, die die USDT0 hält, oder öffne ihren SEP-7-Link in dieser Wallet." },
          submit: { title: "Übermittle sie", body: "Sende die signierte Transaktion an submit. Lehnt das Netzwerk sie ab, bleibt die Überweisung ausstehend: Behebe die Ursache und übermittle sie erneut, bevor sie abläuft." },
          follow: { title: "Verfolge sie bis zur Zustellung", body: "Die Überweisung geht von PENDING über SUBMITTED zu DELIVERED, auf jeder Route in etwa 27 Minuten, während die Verifier von LayerZero auf die Bestätigungen von Stellar warten. Nach der Zustellung enthält sie die Transaktion des Zielnetzwerks und einen Link zu LayerZero Scan." },
        },
        links: { usdt0Docs: "USDT0 im SDK", usdt0Api: "API für USDT0" },
      },
      faq: {
        arrive: { q: "Was erhält die empfangende Adresse?", a: "Auf Ethereum natives USDT. Auf jeder anderen Route USDT0." },
        time: { q: "Wie lange dauert eine Überweisung?", a: "Etwa 27 Minuten auf jeder Route, gemessen auf LayerZero Scan: Die Verifier von LayerZero warten auf die Bestätigungen von Stellar, bevor die Überweisung zugestellt wird." },
        test: { q: "Kann ich es in einem Testnetz ausprobieren?", a: "Nein. USDT0-Überweisungen laufen nur in den Mainnets; mit einem Testschlüssel ist keine Route verfügbar." },
        custody: { q: "Verwahrt Cosmos Pay meine USDT0?", a: "Nein. Deine Wallet signiert die Transaktion, die sie sendet; Cosmos Pay baut sie nur und leitet sie weiter." },
      },
    },
  },
};

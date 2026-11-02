/* The gateway's guides in German. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const de: LearnMessages = {
  hub: {
    nav: "Anleitungen",
    title: "Anleitungen für Stablecoin-Zahlungen",
    lede: "Anleitungen für Unternehmen, die mit Cosmos Pay in Stablecoins kassieren: wie du USDC online und in jedem Netzwerk annimmst (Stellar mit SEP-7, Solana mit Solana Pay, Monad mit EIP-681), wie du deiner Website einen Bezahlbutton hinzufügst, wie du Spenden mit offenem Betrag annimmst, wie du einen Zahlungslink per WhatsApp sendest, wie du Zahlungen auf deinem Server bestätigst, was ein Stablecoin-Zahlungsgateway macht, wie sich die drei Netzwerke unterscheiden, wie du Token zwischen Netzwerken tauschst und wie du USDT0 von Stellar an EVM-Netzwerke sendest.",
    meta: "Anleitungen für Stablecoin-Zahlungen | Cosmos Pay",
    description: "Anleitungen: USDC online und in jedem Netzwerk annehmen, Bezahlbuttons, Spenden, Webhooks, WhatsApp-Links, Cross-Chain-Swaps und USDT0 von Stellar.",
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
    stellarHowTo: {
      nav: "USDC auf Stellar",
      title: "So nimmst du USDC auf Stellar mit SEP-7-Links an",
      meta: "Stellar-SEP-7-Zahlungslinks Schritt für Schritt | Cosmos Pay",
      description: "Nimm USDC auf Stellar mit einem SEP-7-Link und QR-Code an: die Trustline, die dein Konto braucht, Tests im Testnet und wie jede Zahlung zugeordnet wird.",
      summary: "Kassiere USDC auf Stellar mit einem SEP-7-Link: Bereite dein Konto vor, teste im Testnet und sieh, wie jede Zahlung bestätigt wird.",
      lede: "Mit Cosmos Pay ist ein Zahlungslink auf Stellar eine SEP-7-Anfrage: Dein Kunde scannt ihren QR-Code oder öffnet sie in einer Wallet wie Freighter, LOBSTR oder xBull und bestätigt dort die USDC-Zahlung. Die USDC gehen direkt an dein Stellar-Konto, und Cosmos Pay markiert den Link als bezahlt, sobald es die Zahlung anhand des Memos des Links findet. Dein Konto muss bereits eine Trustline für USDC haben, um sie zu empfangen.",
      sections: {
        what: {
          title: "Was ein SEP-7-Link enthält",
          body: [
            "SEP-7 ist der Standard von Stellar für Zahlungsanforderungen: ein web+stellar:pay-Link oder sein QR-Code mit deiner Adresse, dem Betrag, dem Asset und seinem Herausgeber sowie einem numerischen Memo.",
            "Cosmos Pay erstellt für jeden Link ein Memo und sucht in den Zahlungen an dein Konto danach. Es akzeptiert eine Zahlung, die nach dem Erstellen des Links mit diesem Memo an deine Adresse geht, im Asset des Links und, wenn der Link einen Betrag festlegt, über genau diesen Betrag.",
          ],
          links: { sep7: "Der Standard SEP-7 (Stellar)", stellar: "Zahlungen auf Stellar" },
        },
        prepare: {
          title: "Bereite dein Konto vor",
          points: [
            "Dein Stellar-Konto muss im Netzwerk existieren und eine Trustline für USDC haben, bevor es USDC empfangen kann. Cosmos Pay prüft das nicht, wenn du das Konto hinzufügst, und eine Zahlung an ein Konto ohne die Trustline schlägt fehl, nachdem dein Kunde signiert hat.",
            "Füge das Konto im Dashboard deiner Organisation hinzu und signiere, was es anfordert. Damit beweist du, dass das Konto dir gehört.",
            "Für Tests machst du dasselbe im Testnet. Friendbot, der Faucet des Testnets, sendet Test-XLM an ein Konto, und Links können dort in XLM kassieren.",
          ],
        },
        payer: {
          title: "Was dein Kunde braucht",
          points: [
            "Eine Stellar-Wallet, die SEP-7-Links öffnet, etwa Cosmos Pay Wallet, Freighter, LOBSTR, xBull, Albedo oder Rabet, mit den USDC und etwas XLM für die Netzwerkgebühr. Kein Konto bei Cosmos Pay.",
            "Eine direkte USDC-Zahlung. Eine Wallet, die unterwegs ein anderes Asset in USDC umtauscht (ein Path Payment), begleicht den Link nicht.",
            "Im Testnet eine Wallet, die vor dem Bezahlen auf Testnet gestellt ist: Der Link nennt das Netzwerk nicht, und eine Wallet, die SEP-7 folgt, geht dann vom Mainnet aus.",
          ],
        },
        api: {
          title: "Den Link von deinem Server aus erstellen",
          body: [
            "Rufe POST /v1/payment-intents/pay mit deinem Konto als Ziel, dem Betrag und, für USDC, dem Asset-Code mit seinem Herausgeber auf, oder nutze client.paymentIntents.createPay im TypeScript-SDK: Stellar ist der Standardwert für chain. Die Antwort enthält den Link (seine uri beginnt mit web+stellar:pay) und seinen QR-Code.",
            "Wenn du das Konto deines Kunden kennst, gibt eine Transaktionsabsicht (POST /v1/payment-intents/tx oder createTx im SDK) stattdessen eine unsignierte Transaktion zurück, die er signiert. Sie muss innerhalb von fünf Minuten signiert werden.",
            "Wenn du ein eigenes Memo setzt, verwende es nur für eine Zahlung: Dasselbe Memo mit anderen Bedingungen wird abgelehnt.",
          ],
          links: { paymentIntents: "API für Zahlungsabsichten", sdkPaymentIntents: "Zahlungsabsichten im SDK" },
        },
        know: {
          title: "Gut zu wissen",
          points: [
            "Du kannst den Betrag leer lassen und ihn deinen Kunden wählen lassen. Eine Nachricht mit bis zu 300 Zeichen erscheint in der Wallet deines Kunden.",
            "Mit deiner eigenen Gebühr auf der Zahlung fragt der Checkout nach dem Konto deines Kunden und baut eine Transaktion, die dich und deine Gebühren-Wallet bezahlt.",
            "Im Dashboard hat ein ausstehender Stellar-Link eine Prüfung, die ihn anhand eines Transaktions-Hashs begleicht.",
            "Eine Zahlung, die nach Ablauf des Links ankommt, begleicht ihn, wenn du ihren Transaktions-Hash an POST /v1/payment-intents/:id/validate sendest.",
            "Die Wallet deines Kunden zahlt die Netzwerkgebühr von Stellar in XLM. Private Zahlungen, die den Betrag on-chain verbergen, laufen auf Stellar in XLM, vorerst im Testnet.",
          ],
          links: { fees: "Preise und Gebührenrechner", networksGuide: "Stellar vs. Solana vs. Monad" },
        },
      },
      steps: {
        title: "Deine erste USDC-Zahlung auf Stellar annehmen",
        items: {
          sandbox: { title: "Wechsle in die Sandbox", body: "Melde dich im Dashboard an und wähle oben „Sandbox“. Links, die du dort erstellst, laufen im Stellar Testnet und bewegen kein echtes Geld." },
          wallet: { title: "Füge dein Stellar-Konto hinzu", body: "Stelle sicher, dass das Konto existiert und eine Trustline für USDC hat, füge es dann in den Einstellungen deiner Organisation hinzu und signiere, was das Dashboard anfordert." },
          create: { title: "Erstelle den Link", body: "Wähle unter „Zahlungen“ „Zahlungslink erstellen“, dann Stellar, den Betrag (oder keinen) und USDC, danach dein Konto und, wenn du möchtest, eine Nachricht." },
          pay: { title: "Bezahle ihn aus einer Wallet", body: "Öffne die Bezahlseite und scanne ihren QR-Code mit einer Stellar-Wallet, die auf dasselbe Netzwerk gestellt ist, oder öffne den Link auf demselben Gerät. Bestätige die Zahlung, und der Checkout springt auf „Bezahlt“, sobald Cosmos Pay sie findet." },
          confirm: { title: "Bestätige sie auf deinem Server", body: "Füge im Dashboard einen Webhook-Endpunkt hinzu. Wenn die Zahlung bestätigt ist, sendet Cosmos Pay PAYMENT_INTENT_SUCCEEDED, signiert mit HMAC-SHA256. Liefere die Bestellung aus, wenn dieses Ereignis ankommt." },
          live: { title: "Wechsle in die Produktion", body: "Wähle „Produktion“ und erstelle einen Produktions-API-Schlüssel (er beginnt mit prod_). Links laufen jetzt im Mainnet von Stellar, wo USDC von Circle voreingestellt ist." },
        },
        links: { webhooksGuide: "So bestätigst du eine Zahlung auf deinem Server", apiKeys: "API-Schlüssel" },
      },
      faq: {
        trustline: { q: "Warum ist eine Zahlung an mein Konto fehlgeschlagen?", a: "Der häufigste Grund ist eine fehlende USDC-Trustline auf dem empfangenden Konto. Füge die Trustline hinzu, erstelle dann einen neuen Link und sende ihn erneut." },
        wallets: { q: "Welche Wallets können einen SEP-7-Link bezahlen?", a: "Jede Stellar-Wallet, die SEP-7-Links öffnet, etwa Cosmos Pay Wallet, Freighter, LOBSTR, xBull, Albedo oder Rabet." },
        convert: { q: "Kann mein Kunde einen USDC-Link mit XLM bezahlen?", a: "Nein. Nur eine direkte USDC-Zahlung begleicht ihn: Eine Zahlung, die unterwegs XLM in USDC umtauscht, tut das nicht." },
        test: { q: "Kann ich ohne echtes Geld testen?", a: "Ja. In der Sandbox und mit Testschlüsseln (dv_) laufen Links im Stellar Testnet, wo USDC voreingestellt ist und Friendbot Test-XLM sendet." },
      },
    },
    monadHowTo: {
      nav: "USDC auf Monad",
      title: "So nimmst du USDC auf Monad mit EIP-681-Links an",
      meta: "Monad-EIP-681-Zahlungslinks Schritt für Schritt | Cosmos Pay",
      description: "Nimm USDC auf Monad mit einem EIP-681-Link und QR-Code an: die für jede Zahlung angelegte Einzahlungsadresse, der nötige Betrag, Tests und Bestätigung.",
      summary: "Kassiere USDC auf Monad mit einem EIP-681-Link an eine Einzahlungsadresse, die für die Zahlung angelegt wird, und sieh, wie sie bestätigt wird.",
      lede: "Mit Cosmos Pay ist ein Zahlungslink auf Monad eine EIP-681-Anfrage an eine Einzahlungsadresse, die für diese Zahlung angelegt wird: Dein Kunde scannt ihren QR-Code mit einer EVM-Wallet und bestätigt die USDC-Überweisung. Die Einzahlungsadresse kann das Geld nur an deine Adresse weiterleiten, und Cosmos Pay markiert den Link als bezahlt, sobald sie das tut. Jeder Monad-Link braucht einen Betrag.",
      sections: {
        what: {
          title: "Was ein EIP-681-Link enthält",
          body: [
            "EIP-681 ist der Ethereum-Standard für Zahlungsanforderungen, die EVM-Wallets lesen: ein ethereum:-Link oder sein QR-Code mit dem Token, dem Netzwerk und dem Betrag. Das Mainnet von Monad hat die Chain-ID 143, sein Testnet die 10143.",
            "Der Link zahlt an eine Einzahlungsadresse, die für diese Zahlung angelegt wird, nicht direkt an deine Adresse. Ihr Code kann nur an deine Adresse senden, was sie empfängt, also hält Cosmos Pay keinen Schlüssel, der das Geld woandershin bewegen könnte.",
          ],
          links: { eip681: "Der Standard EIP-681 (Ethereum)", monad: "Zahlungen auf Monad" },
        },
        deposit: {
          title: "Wie die Einzahlungsadresse dich bezahlt",
          points: [
            "Cosmos Pay beobachtet die Einzahlungsadresse. Sobald sie mindestens den Betrag hält, leitet ein Relay das Geld an deine Adresse weiter, und diese Weiterleitung begleicht den Link.",
            "Das Relay kann für die Weiterleitung eine Gebühr von der Zahlung abziehen. Der Checkout zeigt sie an, und die API gibt sie bei der Zahlung als networkFee an.",
            "Mehr als der Betrag wird vollständig an dich weitergeleitet. Weniger als der Betrag begleicht den Link nicht.",
            "Die Wallet deines Kunden zahlt die Netzwerkgebühr von Monad für ihre eigene Überweisung in MON.",
          ],
        },
        api: {
          title: "Den Link von deinem Server aus erstellen",
          body: [
            "Rufe POST /v1/payment-intents/pay mit chain auf monad, deiner Adresse als Ziel, dem Betrag und, für USDC, dem Asset-Code mit seinem Contract als Herausgeber auf, oder übergib chain: 'monad' an client.paymentIntents.createPay im TypeScript-SDK (Version 2.2 oder neuer). Die Antwort enthält den Link (seine uri beginnt mit ethereum:) und seinen QR-Code.",
            "Monad-Links nehmen keine Nachricht an. Um eine Zahlung zu bestätigen, bevor die Weiterleitung ankommt, sende den Transaktions-Hash deines Kunden (0x und 64 Hexadezimalzeichen) an POST /v1/payment-intents/:id/validate.",
          ],
          links: { paymentIntents: "API für Zahlungsabsichten", sdkPaymentIntents: "Zahlungsabsichten im SDK" },
        },
        know: {
          title: "Gut zu wissen",
          points: [
            "Ein Link ist nur eine begrenzte Zeit offen. Eine vollständige Zahlung, die danach noch ankommt, wird an dich weitergeleitet und markiert den Link als bezahlt.",
            "Eine weitere Zahlung an dieselbe Einzahlungsadresse wird ebenfalls an deine Adresse weitergeleitet.",
            "Mit deiner eigenen Gebühr auf der Zahlung teilt die Einzahlungsadresse sie auf: deine Gebühr an deine Gebühren-Wallet und den Rest an dich.",
            "Jede Zahlung kostet den Satz deines Tarifs, wie in jedem Netzwerk.",
          ],
          links: { fees: "Preise und Gebührenrechner", networksGuide: "Stellar vs. Solana vs. Monad" },
        },
      },
      steps: {
        title: "Deine erste USDC-Zahlung auf Monad annehmen",
        items: {
          sandbox: { title: "Wechsle in die Sandbox", body: "Melde dich im Dashboard an und wähle oben „Sandbox“. Links, die du dort erstellst, laufen im Monad Testnet, in dem kein USDC voreingestellt ist: Kassiere in MON oder gib einen Token über seinen Contract an." },
          wallet: { title: "Füge deine Monad-Adresse hinzu", body: "Füge in den Einstellungen deiner Organisation die EVM-Adresse hinzu, die das Geld auf Monad empfängt, und signiere, was das Dashboard anfordert. Damit beweist du, dass sie dir gehört." },
          create: { title: "Erstelle den Link", body: "Wähle unter „Zahlungen“ „Zahlungslink erstellen“, dann Monad, gib den Betrag ein (er ist erforderlich), wähle das Asset und dann deine Adresse." },
          pay: { title: "Bezahle ihn aus einer Wallet", body: "Öffne die Bezahlseite und scanne ihren QR-Code mit einer EVM-Wallet, die EIP-681-Links liest, im selben Netzwerk. Bestätige die Überweisung, und der Checkout springt auf „Bezahlt“, sobald die Zahlung an dich weitergeleitet ist." },
          confirm: { title: "Bestätige sie auf deinem Server", body: "Füge im Dashboard einen Webhook-Endpunkt hinzu. Wenn die Zahlung bestätigt ist, sendet Cosmos Pay PAYMENT_INTENT_SUCCEEDED, signiert mit HMAC-SHA256. Liefere die Bestellung aus, wenn dieses Ereignis ankommt." },
          live: { title: "Wechsle in die Produktion", body: "Wähle „Produktion“ und erstelle einen Produktions-API-Schlüssel (er beginnt mit prod_). Links laufen jetzt im Mainnet von Monad, wo USDC eine eigene Voreinstellung hat." },
        },
        links: { webhooksGuide: "So bestätigst du eine Zahlung auf deinem Server", apiKeys: "API-Schlüssel" },
      },
      faq: {
        why: { q: "Warum zahlt der Link an eine Einzahlungsadresse und nicht an meine Adresse?", a: "Jede Zahlung bekommt ihre eigene Adresse, so kann Cosmos Pay Zahlungen ohne Memo auseinanderhalten. Die Adresse kann nur an deine Adresse weiterleiten, was sie empfängt." },
        fees: { q: "Wer zahlt die Gebühren auf Monad?", a: "Die Wallet deines Kunden zahlt die Netzwerkgebühr für ihre Überweisung. Die Gebühr des Relays für die Weiterleitung, falls es eine gibt, wird von der Zahlung abgezogen und im Checkout angezeigt." },
        amount: { q: "Kann mein Kunde den Betrag wählen?", a: "Nein. Ein Monad-Link braucht einen Betrag. Für offene Beträge nutze einen Stellar- oder Solana-Link." },
        test: { q: "Kann ich auf Monad testen?", a: "Ja. In der Sandbox und mit Testschlüsseln (dv_) laufen Links im Monad Testnet. Dort ist kein USDC voreingestellt, kassiere also in MON oder gib einen Token über seinen Contract an." },
      },
    },
    embed: {
      nav: "Bezahlbutton auf deiner Website",
      title: "So fügst du deiner Website einen Krypto-Bezahlbutton oder Checkout hinzu",
      meta: "Krypto-Bezahlbutton auf der Website einbauen | Cosmos Pay",
      description: "Bezahlbutton oder eingebetteter Checkout auf jeder Website, mit einem Script-Tag und ohne API-Schlüssel in der Seite: Attribute, Ereignisse, CSP und Tests.",
      summary: "Lade ein Skript, füge einen Bezahlbutton oder einen eingebetteten Checkout für einen Zahlungslink hinzu und bestätige die Zahlung auf deinem Server.",
      lede: "Um auf deiner eigenen Website eine Stablecoin-Zahlung anzunehmen, lädst du das Embed-Skript von Cosmos Pay einmal und fügst ein Element cosmos-pay-button oder cosmos-pay-checkout mit der ID eines Zahlungslinks hinzu. Der Button öffnet den gehosteten Checkout in einem Pop-up, und der eingebettete Checkout zeigt die Zahlung direkt in deiner Seite an. Die Seite braucht keinen API-Schlüssel, und dein Server bestätigt die Zahlung über einen signierten Webhook.",
      sections: {
        what: {
          title: "Button oder eingebetteter Checkout",
          points: [
            "Der Bezahlbutton (cosmos-pay-button) öffnet den gehosteten Checkout in einem Pop-up, zentriert über deiner Seite. Blockiert der Browser das Pop-up, wechselt stattdessen derselbe Tab zum Checkout.",
            "Der eingebettete Checkout (cosmos-pay-checkout) zeigt die Zahlung direkt in deiner Seite an, bis zu 420 Pixel breit: den Betrag, den QR-Code, einen Button, der die Wallet des Zahlers öffnet, und den Live-Status.",
            "Beide funktionieren für Zahlungslinks auf Stellar, Solana und Monad, auf Englisch, Spanisch, Portugiesisch, Französisch, Deutsch, Hindi und Chinesisch.",
          ],
        },
        link: {
          title: "Woher der Link kommt",
          body: [
            "Jedes Element zeigt einen Zahlungslink, den du über seine ID im Attribut link angibst. Erstelle den Link im Dashboard oder, wenn dein Kunde zur Kasse geht, von deinem Server aus mit der Zahlungs-API oder dem TypeScript-SDK, und setze seine ID in die Seite. Die Seite liest den Link ohne API-Schlüssel, dein geheimer Schlüssel bleibt also auf deinem Server.",
            "Zeige pro Zahlung einen eingebetteten Checkout: Ein Link wird einmal bezahlt.",
          ],
          links: { paymentLinks: "API für Zahlungslinks", acceptGuide: "So nimmst du USDC-Zahlungen online an" },
        },
        options: {
          title: "Attribute und Gestaltung",
          points: [
            "link: die ID des Zahlungslinks. Erforderlich.",
            "lang: die Sprache, etwa es oder es-AR. Standardmäßig die Browsersprache des Zahlers, sonst Englisch.",
            "theme: light (der Standard), dark oder auto, das der Systemeinstellung des Zahlers folgt.",
            "demo: zeigt ein Beispiel, das sich nicht bezahlen lässt und keine Anfrage sendet, für Vorführungen.",
            "Text im Button ersetzt seine Beschriftung, und mit ::part(button) und ::part(card) gestaltet dein CSS die Elemente um.",
          ],
        },
        confirm: {
          title: "Ereignisse und Bestätigung der Zahlung",
          body: [
            "Beide Elemente lösen auf deiner Seite die Ereignisse cosmospay:status und cosmospay:paid aus, mit der ID und dem Status des Links. Nutze sie, um zu aktualisieren, was der Zahler sieht, nicht um die Bestellung auszuliefern: Ein Ereignis in der Seite lässt sich fälschen.",
            "Liefere die Bestellung aus, wenn dein Server PAYMENT_INTENT_SUCCEEDED erhält, den signierten Webhook, den Cosmos Pay sendet, sobald das Netzwerk die Zahlung bestätigt. Sendet deine Seite eine Cross-Origin-Opener-Policy mit dem Wert same-origin oder wird das Pop-up blockiert, sendet der Button keine Ereignisse.",
          ],
          links: { webhooksGuide: "So bestätigst du eine Zahlung auf deinem Server" },
        },
      },
      steps: {
        title: "Einen Bezahlbutton einbauen, Schritt für Schritt",
        items: {
          script: { title: "Lade das Skript", body: "Füge deiner Seite einmal ein Script-Tag hinzu: https://payments.cosmospay.lat/embed/cosmos-pay.js, mit dem Attribut defer." },
          link: { title: "Hol dir einen Zahlungslink", body: "Erstelle einen Link im Dashboard oder, wenn dein Kunde zur Kasse geht, von deinem Server aus, und merke dir seine ID." },
          element: { title: "Füge das Element hinzu", body: "Schreibe ein Element cosmos-pay-button oder cosmos-pay-checkout, setze link auf diese ID und, wenn du möchtest, lang oder theme." },
          csp: { title: "Erlaube es in deiner CSP", body: "Wenn deine Website eine Content Security Policy sendet, erlaube script-src https://payments.cosmospay.lat, connect-src https://api.cosmospay.lat und img-src data:." },
          test: { title: "Teste es", body: "Nutze einen Link, der in der Sandbox erstellt wurde: Der eingebettete Checkout zeigt an, dass er in einem Testnetz läuft. Das Attribut demo zeigt ein Beispiel ganz ohne Link." },
          confirm: { title: "Bestätige die Zahlung auf deinem Server", body: "Füge einen Webhook-Endpunkt hinzu und liefere die Bestellung aus, wenn PAYMENT_INTENT_SUCCEEDED ankommt." },
        },
        links: { embed: "Eine Zahlung einbetten (Dokumentation)", webhooks: "Webhooks" },
      },
      faq: {
        key: { q: "Braucht die Seite meinen API-Schlüssel?", a: "Nein. Die Elemente lesen den Zahlungslink ohne Schlüssel. Erstelle Links auf deinem Server, wo der Schlüssel bleibt." },
        iframe: { q: "Ist der eingebettete Checkout ein iframe?", a: "Nein. Er wird in deiner Seite in seinem eigenen Shadow DOM gezeichnet, also ist keine Regel für frame-src nötig. Der gehostete Checkout selbst lässt sich nicht in einen Frame einbetten." },
        reuse: { q: "Kann ein Button viele Zahlungen annehmen?", a: "Nein. Ein Link wird einmal bezahlt. Gib also jeder Zahlung ihren eigenen Link, etwa indem du ihn auf deinem Server erstellst, wenn der Kunde zur Kasse geht." },
        sites: { q: "Funktioniert es auf jeder Website?", a: "Ja, auf jeder Seite, die ein Skript laden kann, solange ihre Content Security Policy das Skript, die API und data:-Bilder erlaubt." },
      },
    },
    crossChain: {
      nav: "Cross-Chain-Swaps",
      title: "So tauschst du Token zwischen Stellar, Solana und Monad",
      meta: "Swaps zwischen Stellar, Solana und Monad | Cosmos Pay",
      description: "Tausche Token zwischen Stellar, Solana, Monad und 32 weiteren Netzwerken mit Cosmos Pay und NEAR Intents: Angebot, Einzahlung, Gebühren, Erstattung, Dauer.",
      summary: "Hol dir ein Angebot, sende die Einzahlung und verfolge den Swap bis zur Zustellung: Cross-Chain-Swaps über NEAR Intents, die bei einem Fehlschlag im Ausgangsnetzwerk erstattet werden.",
      lede: "Cosmos Pay tauscht Token zwischen Stellar, Solana, Monad und den anderen Netzwerken, die NEAR Intents erreicht, insgesamt 35. Du erhältst ein Angebot, sendest den Eingangsbetrag vor Ablauf des Angebots an eine Einzahlungsadresse, und der Ausgangsbetrag kommt an deiner Adresse im anderen Netzwerk an. Kann der Swap nicht abgeschlossen werden, wird der Eingangsbetrag an deine Adresse in dem Netzwerk erstattet, von dem aus du gesendet hast.",
      sections: {
        how: {
          title: "So funktioniert ein Cross-Chain-Swap",
          points: [
            "Angebot: Die API fragt NEAR Intents nach einem Preis und gibt zurück, was du sendest, was du nach allen Gebühren erhältst und die Provision deines Tarifs. Ein Angebot speichert nichts.",
            "Erstellen: Das Live-Angebot liefert eine Einzahlungsadresse (auf Stellar mit einem Memo), einen Zahlungslink mit seinem QR-Code und eine Frist, standardmäßig 30 Minuten.",
            "Einzahlung: Sende den Eingangsbetrag vor Ablauf der Frist an diese Adresse. Du kannst die Einzahlung auch der API melden.",
            "Zustellung: Der Swap durchläuft „Einzahlung erkannt“ und „In Bearbeitung“ bis „Erfolgreich“, wenn der Ausgangsbetrag deine Adresse erreicht.",
          ],
        },
        refunds: {
          title: "Wenn er nicht abgeschlossen wird",
          points: [
            "Ein Swap, der nicht abgeschlossen werden kann, wird an die von dir angegebene Erstattungsadresse erstattet, in dem Netzwerk, von dem aus du gesendet hast.",
            "Ein abgelaufenes Angebot ist nicht das Ende: Eine Einzahlung, die danach noch ankommt, wird erstattet. Cosmos Pay beobachtet einen abgelaufenen Swap noch 24 Stunden lang.",
            "Die Endzustände sind „Erfolgreich“, „Erstattet“ und „Fehlgeschlagen“.",
          ],
        },
        fees: {
          title: "Was es kostet",
          body: [
            "Das Angebot zeigt die Provision von Cosmos Pay in dem Asset, das du sendest: den Swap-Satz deines Tarifs, 0.65% bei Starter und auf der öffentlichen Swap-Seite, bis hinunter zu 0.07% bei Enterprise. Der Betrag, den du laut Angebot erhältst, ist bereits abzüglich aller Gebühren, einschließlich der Netzwerk- und Anbieterkosten.",
            "Die Slippage beträgt standardmäßig 1% und höchstens 5%.",
          ],
          links: { fees: "Preise und Gebührenrechner" },
        },
        where: {
          title: "Wo du tauschen kannst",
          points: [
            "Auf der öffentlichen Swap-Seite, ohne Konto: Sie nutzt einen gemeinsamen öffentlichen Schlüssel und berechnet den Satz von 0.65%.",
            "Im Swap-Bereich des Dashboards, in der Produktion.",
            "Mit der API (/v1/cross-chain-swaps) oder mit client.crossChainSwaps im TypeScript-SDK, das Stellar, Solana und Monad abdeckt.",
            "Nur in den Mainnets: Ein Testschlüssel (dv_) kann Assets auflisten und Angebote abrufen, aber keinen Swap erstellen.",
          ],
          links: { swaps: "Die Swap-Seite", crossChainApi: "API für Cross-Chain-Swaps" },
        },
      },
      steps: {
        title: "Deinen ersten Cross-Chain-Swap ausführen",
        items: {
          route: { title: "Wähle die Route", body: "Wähle das Asset, das du sendest, und das, das du haben willst, jeweils in seinem Netzwerk, sowie die Adresse, die den Ausgangsbetrag empfängt." },
          quote: { title: "Hol dir ein Angebot", body: "Fordere ein Angebot mit dem Betrag und einer Erstattungsadresse in dem Netzwerk an, von dem aus du sendest. Prüfe, was ankommt, und die Provision." },
          create: { title: "Erstelle den Swap", body: "Erstelle ihn aus dem Angebot. Du erhältst die Einzahlungsadresse (auf Stellar mit einem Memo), den zu sendenden Betrag und die Frist." },
          send: { title: "Sende die Einzahlung", body: "Sende den Eingangsbetrag vor Ablauf der Frist aus deiner Wallet an die Einzahlungsadresse." },
          follow: { title: "Verfolge ihn", body: "Rufe den Swap ab oder beobachte ihn im Dashboard, bis er erfolgreich ist. Webhooks melden deinem Server jedes Ereignis eines Cross-Chain-Swaps." },
        },
        links: { crossChainApi: "API für Cross-Chain-Swaps", webhooksGuide: "So bestätigst du eine Zahlung auf deinem Server" },
      },
      faq: {
        networks: { q: "Zwischen welchen Netzwerken kann ich tauschen?", a: "Stellar, Solana, Monad und die anderen Netzwerke, die NEAR Intents erreicht, insgesamt 35. Ein Paar innerhalb eines Netzwerks ist stattdessen ein Swap auf derselben Chain." },
        test: { q: "Kann ich einen Cross-Chain-Swap testen?", a: "Nicht in einem Testnetz: Diese Swaps laufen nur in den Mainnets. Ein Testschlüssel kann Assets auflisten und Angebote abrufen." },
        refund: { q: "Was passiert mit meinem Geld, wenn der Swap fehlschlägt?", a: "Es wird an die von dir angegebene Erstattungsadresse erstattet, in dem Netzwerk, von dem aus du gesendet hast." },
        account: { q: "Brauche ich ein Konto?", a: "Nicht auf der öffentlichen Swap-Seite. Mit deinem eigenen Konto wenden das Dashboard und die API den Satz deines Tarifs an." },
      },
    },
    donations: {
      nav: "Krypto-Spenden",
      title: "So nimmst du Krypto-Spenden mit offenem Betrag an",
      meta: "Krypto-Spenden mit offenem Betrag annehmen | Cosmos Pay",
      description: "Stablecoin-Spenden auf Stellar oder Solana per Link mit offenem Betrag annehmen: Spender wählen den Betrag in ihrer Wallet. Funktionsweise und Grenzen.",
      summary: "Lass jeden Spender den Betrag wählen: Links mit offenem Betrag auf Stellar und Solana, pro Spender erstellt und per Webhook bestätigt.",
      lede: "Um eine Spende in Stablecoins anzunehmen, erstellst du auf Stellar oder Solana einen Zahlungslink ohne Betrag: Der Spender öffnet ihn, wählt den Betrag in seiner Wallet und zahlt direkt an deine Adresse. Jeder Link nimmt eine Zahlung an und ist nur eine begrenzte Zeit offen, erstelle also einen pro Spender, etwa wenn jemand auf deiner Website auf „Spenden“ klickt. Cosmos Pay markiert den Link als bezahlt, sobald das Netzwerk die Spende bestätigt.",
      sections: {
        how: {
          title: "So funktioniert ein Link mit offenem Betrag",
          points: [
            "Lass den Betrag leer, wenn du den Link erstellst, im Dashboard oder mit der API. Der Checkout zeigt „Freier Betrag“ an und sagt dem Spender, dass er ihn in seiner Wallet wählt.",
            "Die Wallet des Spenders legt den Betrag fest: Jeder positive Betrag im Asset des Links begleicht ihn, auf Stellar mit dem Memo des Links.",
            "Eine Nachricht mit bis zu 300 Zeichen, etwa ein Dankeschön, erscheint in der Wallet des Spenders.",
          ],
        },
        limits: {
          title: "Grenzen, die du einplanen solltest",
          points: [
            "Nur Stellar und Solana: Ein Monad-Link braucht einen Betrag.",
            "Ein Link nimmt eine Spende an. Ist er bezahlt, kann er nicht noch einmal bezahlt werden, ein einzelner Link auf einem gedruckten Plakat dient also nur dem ersten Spender.",
            "Ein Link ist nur eine begrenzte Zeit offen, die der Checkout als Countdown zeigt.",
            "Deine eigene Gebühr auf eine Zahlung braucht einen festen Betrag, sie gilt also nicht für Links mit offenem Betrag.",
          ],
        },
        amount: {
          title: "Den gespendeten Betrag ablesen",
          body: [
            "Ein Link mit offenem Betrag speichert keinen Betrag: Wenn er bezahlt wird, erfasst Cosmos Pay den Transaktions-Hash und die Adresse des Spenders, und der Webhook enthält beides. Lies den gespendeten Betrag aus dieser Transaktion im Netzwerk ab, etwa um dem Spender zu danken oder eine Quittung auszustellen.",
          ],
          links: { webhooksGuide: "So bestätigst du eine Zahlung auf deinem Server" },
        },
        site: {
          title: "Ein Spenden-Button auf deiner Website",
          body: [
            "Wenn ein Besucher auf „Spenden“ klickt, lass deinen Server einen Link mit offenem Betrag erstellen und zeige ihn mit dem eingebetteten Checkout an, oder schicke den Besucher auf seine Bezahlseite. So bekommt jeder Besucher einen neuen Link. Im Browser kann eine Stellar-Wallet ihn auch über den WebClient des SDK mit dem vom Spender gewählten Betrag bezahlen: webClient.pay(intent, { amount }).",
          ],
          links: { embedGuide: "Einen Bezahlbutton oder Checkout auf deiner Website einbauen", paymentIntents: "API für Zahlungsabsichten" },
        },
      },
      steps: {
        title: "Deine erste Spende annehmen",
        items: {
          sandbox: { title: "Wechsle in die Sandbox", body: "Wähle im Dashboard „Sandbox“: Links laufen im Stellar Testnet oder im Solana Devnet und bewegen kein echtes Geld." },
          create: { title: "Erstelle einen Link mit offenem Betrag", body: "Wähle unter „Zahlungen“ „Zahlungslink erstellen“, dann Stellar oder Solana und das Asset, lass den Betrag leer und füge, wenn du möchtest, eine Dankesnachricht hinzu." },
          share: { title: "Teile ihn", body: "Sende die Bezahlseite, zeige ihren QR-Code oder bette sie in deine Seite ein." },
          give: { title: "Spende aus einer Wallet", body: "Öffne den Link in einer Wallet im selben Netzwerk, gib einen Betrag ein und bestätige. Der Checkout springt auf „Bezahlt“, sobald das Netzwerk die Spende bestätigt." },
          confirm: { title: "Bestätige sie auf deinem Server", body: "Wenn PAYMENT_INTENT_SUCCEEDED ankommt, lies die Transaktion, um den Betrag zu erfahren, und danke dem Spender." },
        },
        links: { webhooks: "Webhooks", embed: "Eine Zahlung einbetten (Dokumentation)" },
      },
      faq: {
        once: { q: "Kann ein Link viele Spenden sammeln?", a: "Nein. Ein Link wird einmal bezahlt. Erstelle für jeden Spender einen neuen Link, etwa von deinem Server aus, wenn jemand auf „Spenden“ klickt." },
        monad: { q: "Kann ich auf Monad Spenden mit offenem Betrag annehmen?", a: "Nein. Ein Monad-Link braucht einen Betrag. Nutze für offene Beträge Stellar oder Solana." },
        amount: { q: "Wie erfahre ich, wie viel gespendet wurde?", a: "Lies die Transaktion der Zahlung im Netzwerk: Der Link selbst speichert bei einer Zahlung mit offenem Betrag keinen Betrag." },
        assets: { q: "Welche Assets können Spender geben?", a: "Das auf dem Link festgelegte Asset, etwa USDC oder der Coin des Netzwerks (XLM oder SOL). Der Spender wählt nur den Betrag." },
      },
    },
  },
};

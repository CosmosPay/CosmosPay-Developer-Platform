/* The gateway's guides in German. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const de: LearnMessages = {
  hub: {
    nav: "Anleitungen",
    title: "Anleitungen für Stablecoin-Zahlungen",
    lede: "Anleitungen für Unternehmen, die mit Cosmos Pay in Stablecoins kassieren: wie du online USDC annimmst, wie du einen Zahlungslink per WhatsApp sendest, was ein Stablecoin-Zahlungsgateway macht und wie sich Stellar, Solana und Monad unterscheiden.",
    meta: "Anleitungen für Stablecoin-Zahlungen | Cosmos Pay",
    description: "Anleitungen für Unternehmen: USDC online annehmen, Zahlungslinks per WhatsApp senden, Stablecoin-Zahlungsgateways erklärt und Stellar vs. Solana vs. Monad.",
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
            "Auf Stellar und Solana zahlt dein Kunde direkt an deine Adresse. Auf Monad geht jede Zahlung an ihre eigene Einzahlungsadresse, die sie an deine weiterleitet. Jede Zahlung lässt sich im Netzwerk prüfen, und jeder bezahlte Checkout verlinkt seine Transaktion in einem öffentlichen Explorer.",
          ],
          links: { security: "So werden Zahlungen geschützt", acceptGuide: "So nimmst du USDC-Zahlungen online an", integrations: "Integrationsoptionen" },
        },
      },
      faq: {
        final: { q: "Kann eine Stablecoin-Zahlung zurückgebucht werden?", a: "Nein. Sobald das Netzwerk sie bestätigt, ist sie endgültig. Eine Erstattung ist eine Zahlung, die das Unternehmen aus seiner Wallet zurücksendet." },
        custody: { q: "Verwahrt Cosmos Pay mein Geld?", a: "Nein. Auf Stellar und Solana zahlt der Zahler direkt an deine Adresse. Auf Monad geht jede Zahlung an ihre eigene Einzahlungsadresse, die sie abzüglich der Netzwerkgebühr an deine weiterleitet." },
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
          settle: { k: "Wohin das Geld geht", stellar: "Direkt an deine Adresse", solana: "Direkt an deine Adresse", monad: "Die Einzahlungsadresse leitet es an deine Adresse weiter" },
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
  },
};

/* The gateway's guides in Simplified Chinese. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const zh: LearnMessages = {
  hub: {
    nav: "指南",
    title: "稳定币支付指南",
    lede: "为使用 Cosmos Pay 收取稳定币的企业准备的指南：如何在线或通过 Solana Pay 接受 USDC 支付，如何在 WhatsApp 上发送支付链接，如何在服务器上确认支付，稳定币支付网关有什么作用，Stellar、Solana 与 Monad 的对比，以及如何从 Stellar 向 EVM 网络发送 USDT0。",
    meta: "稳定币支付指南 | Cosmos Pay",
    description: "指南：在线或通过 Solana Pay 接受 USDC、WhatsApp 支付链接、用 Webhook 确认支付、Stellar、Solana 与 Monad 的对比，以及从 Stellar 发送 USDT0。",
  },
  ui: {
    updated: "更新于 {date}",
    by: "作者：Cosmos Pay",
    related: "相关指南",
    more: "更多指南",
    all: "查看全部指南",
  },
  guides: {
    acceptUsdc: {
      nav: "接受 USDC 支付",
      title: "如何在线接受 USDC 支付",
      meta: "如何在线接受 USDC 支付 | Cosmos Pay",
      description: "在 Stellar、Solana 或 Monad 上，通过支付链接、托管收银台或 API 接受 USDC：您和客户各需要什么，以及如何先行测试。",
      summary: "通过支付链接、托管收银台或 API 收取 USDC，并先在测试网上试用。",
      lede: "要使用 Cosmos Pay 在线接受 USDC，请先添加用于收款的钱包，然后通过支付链接、托管收银台或支付 API 收款。客户在 Stellar、Solana 或 Monad 上用自己的钱包付款，USDC 进入您的地址。收取真实资金之前，先在测试网上跑一遍。",
      sections: {
        need: {
          title: "您需要准备什么",
          body: [
            "一个 Cosmos Pay 账户。注册免费，Starter 套餐无月费：每笔支付按 {starterRate} 计费。",
            "一个用于接收 USDC 的钱包地址，须位于您收款所用的网络上：Stellar、Solana 或 Monad。您在控制台中将它添加到您的组织，并通过签名证明它属于您。在控制台中创建的支付链接只会付款到在那里添加的钱包。",
          ],
          links: { fees: "查看各套餐的费率" },
        },
        payer: {
          title: "您的客户需要什么",
          body: [
            "同一网络上的一个钱包，其中持有 USDC 并能打开这笔支付：在 Stellar 上，任何能打开 SEP-7 链接的钱包；在 Solana 上，任何能读取 Solana Pay 链接的钱包；在 Monad 上，任何能读取 EIP-681 链接的 EVM 钱包。网络费也由客户的钱包支付。",
            "无需账户。客户打开收银台，扫描二维码或点击钱包按钮，然后在钱包中确认支付。",
          ],
        },
        ways: {
          title: "三种收款方式",
          body: ["三种方式都使用同一套收银台、控制台和 Webhook，因此您可以先从链接开始，需要时再改用 API。"],
          points: [
            "支付链接：在控制台中创建，通过聊天或邮件发送，或展示其二维码。无需代码。",
            "托管收银台：将客户引导至链接的收银台页面，通过支付按钮打开它，或用一个 script 标签将它显示在您的页面中。",
            "支付 API：从您的服务器用一次请求（或使用 TypeScript SDK）创建每笔支付，并自行设计支付界面。",
          ],
          links: { whatsappGuide: "在 WhatsApp 上发送支付链接", integrations: "试用全部集成选项", embed: "嵌入支付" },
        },
        network: {
          title: "选择哪个网络收款",
          body: [
            "在客户已经持有 USDC 的网络上收款。在 Stellar 和 Solana 的主网与测试网上，以及 Monad 主网上，USDC 都是预设资产。在这三个网络上，任何其他代币都可以按其发行方、铸币地址（mint）或合约收取。",
          ],
          links: { networksGuide: "Stellar、Solana 与 Monad 对比", stellar: "Stellar 支付", solana: "Solana 支付", monad: "Monad 支付" },
        },
        cost: {
          title: "费用是多少",
          body: [
            "每笔支付按您套餐的费率计费，所有网络相同：Starter 为 {starterRate}，无月费。网络费由付款方的钱包支付；在 Monad 上，将付款转发给您的中继所收取的费用从该笔付款中扣除。",
          ],
          links: { fees: "价格与费用计算器", compare: "我们的费用对比" },
        },
      },
      steps: {
        title: "一步步接受您的第一笔 USDC 支付",
        items: {
          sandbox: { title: "创建账户并切换到沙箱", body: "登录控制台，在顶部选择“沙箱”。在那里创建的内容都运行在测试网上（Stellar Testnet、Solana Devnet 和 Monad Testnet），不涉及真实资金。" },
          wallet: { title: "添加收款钱包", body: "在组织设置中，添加一个位于您收款网络上的钱包，并签署控制台请求签署的内容，以证明该钱包属于您。" },
          charge: { title: "创建一笔测试收款", body: "在“支付”中创建支付链接，填写网络、金额、资产和收款钱包。也可以创建测试 API 密钥（以 dv_ 开头），从您的服务器调用 POST /v1/payment-intents/pay。在 Stellar Testnet 上可以用 XLM 收款，Testnet 的水龙头 Friendbot 可为测试账户充入 XLM。" },
          pay: { title: "用测试钱包付款", body: "打开收银台页面：页面会注明它运行在测试网上。用该网络上的钱包付款，然后看着收银台变为“已支付”，控制台中的链接变为“成功”。" },
          confirm: { title: "在服务器上确认支付", body: "在控制台中添加 Webhook 端点。网络确认支付后，Cosmos Pay 会发送使用 HMAC-SHA256 签名的 PAYMENT_INTENT_SUCCEEDED。请在收到该事件时交付订单，而不是在客户页面显示已支付时。" },
          live: { title: "切换到生产环境", body: "在控制台中选择“生产环境”，并创建生产 API 密钥（以 prod_ 开头）。同样的请求现在会在主网上收款：网络由密钥决定，而不是由代码决定。" },
        },
        links: { gettingStarted: "快速入门", apiKeys: "API 密钥", webhooks: "Webhook", paymentIntents: "支付意图 API" },
      },
      faq: {
        nocode: { q: "不写代码也能接受 USDC 吗？", a: "可以。在控制台中创建支付链接，通过聊天或邮件分享，或展示其二维码。每笔支付的状态都会显示在控制台中。" },
        asset: { q: "客户用 USDC 付款，我收到的也是 USDC 吗？", a: "是的。客户以链接上设定的资产付款，同一资产进入您的地址。" },
        test: { q: "可以不用真实资金试用吗？", a: "可以。在沙箱中并使用测试密钥（dv_）时，链接运行在测试网上，其收银台会注明不涉及真实资金。" },
        refunds: { q: "客户可以撤回 USDC 支付吗？", a: "不可以。网络确认支付后，该支付即为最终结果。退款是您从自己的钱包发出的一笔新支付。" },
      },
    },
    whatsapp: {
      nav: "WhatsApp 上的支付链接",
      title: "如何在 WhatsApp 上发送支付链接",
      meta: "WhatsApp 支付链接：创建与分享 | Cosmos Pay",
      description: "在 Cosmos Pay 控制台中创建稳定币支付链接，通过 WhatsApp 或打印的二维码发送，并在付款完成的那一刻看到结果。",
      summary: "在控制台中创建链接，通过聊天发送或打印其二维码，付款完成时即可看到。",
      lede: "在 Cosmos Pay 控制台中创建支付链接，复制其收银台页面地址，粘贴到 WhatsApp 聊天中。客户打开后，在 Stellar、Solana 或 Monad 上用自己的钱包付款；网络确认支付后，控制台中的链接会变为“成功”。",
      sections: {
        before: {
          title: "开始之前",
          body: [
            "在控制台的组织设置中，添加您将用于收款的钱包（须位于您收款所用的网络上）。支付链接只会付款到这些钱包之一。",
            "先在沙箱中试一次：那里的链接运行在测试网上，其收银台会注明不涉及真实资金。",
          ],
        },
        customer: {
          title: "客户看到的内容",
          body: [
            "收银台页面显示金额、资产、网络和剩余支付时间。客户自行选择支付方式：用钱包 App 扫描二维码、在同一设备上的钱包中打开这笔支付，或按页面显示的信息手动转账。",
            "如果客户浏览器的语言是收银台支持的七种语言之一（英语、西班牙语、葡萄牙语、法语、德语、印地语和中文），页面就会以该语言打开。网络确认支付后，页面变为“已支付”，并附上该交易在公共区块浏览器中的链接。客户无需注册账户。",
          ],
        },
        know: {
          title: "须知",
          points: [
            "一个链接对应一笔支付。链接被支付后便不能再次支付，因此请为每笔销售或每张发票各创建一个。",
            "链接的有效时间有限，收银台会以倒计时显示。到期后，收银台会请客户索取新的链接；如果之后仍有支付到达并获确认，该链接会被标记为已支付。",
            "在 Stellar 和 Solana 上可以不填金额，由客户自行决定。Monad 链接必须填写金额。",
            "每笔支付按您套餐的费率计费（Starter 为 {starterRate}，无月费）。网络费由客户的钱包支付。",
          ],
          links: { acceptGuide: "如何在线接受 USDC 支付", paymentLinks: "支付链接 API" },
        },
      },
      steps: {
        title: "创建链接并发送",
        items: {
          create: { title: "创建链接", body: "在控制台中打开“支付”，选择“创建支付链接”。选择网络、金额及其资产，再选择收款钱包和收银台样式。在 Stellar 和 Solana 上，您还可以添加一条客户会在钱包中看到的消息。" },
          copy: { title: "复制收银台页面地址", body: "链接就绪后，复制其收银台页面地址：payments.cosmospay.lat 后接链接的 ID。它可以在任何浏览器中打开，手机或电脑均可。" },
          send: { title: "通过 WhatsApp 发送", body: "把地址粘贴到聊天中，并说明这笔款项的用途。聊天应用的预览会显示一张来自 Cosmos Pay 的通用支付请求卡片，不显示金额或您的地址。邮件、短信和其他任何聊天应用的用法都一样。" },
          qr: { title: "或打印二维码", body: "“下载二维码”会将链接的二维码保存为图片，与收银台页面显示的二维码相同。客户用钱包 App 扫描即可。线下销售时，可以将它打印出来，或显示在屏幕上。" },
          paid: { title: "确认已付款", body: "控制台中的链接页面会跟随客户的进度：“付款方在支付页面”、“已打开钱包”、“付款已发送”、“已支付”。网络确认支付后，链接显示“成功”；如果您添加了 Webhook 端点，您的服务器还会收到 PAYMENT_INTENT_SUCCEEDED。" },
        },
        links: { webhooks: "Webhook", linkDemo: "试用支付链接演示" },
      },
      faq: {
        account: { q: "我的客户需要注册账户吗？", a: "不需要。他们只需要一个位于链接所在网络、且持有该资产的钱包，打开链接后在钱包中确认支付即可。" },
        reuse: { q: "可以把同一个链接发给多位客户吗？", a: "不可以。一个链接只能支付一次。请为每笔销售创建新的链接。" },
        preview: { q: "WhatsApp 预览会显示金额吗？", a: "不会。每个链接的预览都是同一张通用支付请求卡片。客户打开收银台页面时才会看到金额。" },
        expired: { q: "如果客户在链接过期后才打开，会怎样？", a: "收银台会提示链接已过期，并请客户向您索取新的链接。再创建一个链接发给对方即可。" },
      },
    },
    gateway: {
      nav: "稳定币支付网关",
      title: "什么是稳定币支付网关？",
      meta: "什么是稳定币支付网关？ | Cosmos Pay",
      description: "稳定币支付网关有什么作用、资金在哪里结算、网络费由谁支付、托管式与非托管式的区别，以及 Cosmos Pay 如何运作。",
      summary: "网关有什么作用、资金在哪里结算、网络费由谁支付，以及托管式与非托管式的区别。",
      lede: "稳定币支付网关让企业可以用 USDC 等稳定币收款。它创建支付请求，向客户展示如何用自己的钱包付款，并在网络确认支付后通知企业。有些网关会代收款项并为您保留余额；而非托管式网关（例如 Cosmos Pay）会让款项直接付到您掌控的地址。",
      sections: {
        stablecoin: {
          title: "什么是稳定币",
          body: [
            "稳定币是一种旨在相对某种货币（最常见的是美元）保持价值稳定的代币。它像其他代币一样在区块链上流转，从一个钱包转到另一个钱包，无论哪一天、什么时间都可以。",
            "USDC 和 EURC 就是其中两种，均由 Circle 发行。Circle 表示，USDC 可按 1:1 赎回为美元，EURC 可按 1:1 赎回为欧元。",
          ],
          links: { circleUsdc: "Circle 官网上的 USDC", circleEurc: "Circle 官网上的 EURC" },
        },
        does: {
          title: "网关做什么",
          points: [
            "创建支付请求（金额、资产、网络和收款地址），以钱包能读取的格式生成链接和二维码：Stellar 上为 SEP-7，Solana 上为 Solana Pay，Monad 等 EVM 网络上为 EIP-681。",
            "向客户展示包含该请求的收银台页面，让他们用自己已在使用的钱包付款。",
            "监控网络，并通过 memo、reference 密钥或专为该笔支付生成的地址，将每笔付款与其请求匹配。",
            "网络确认支付后通知企业：显示在控制台中，并通过签名 Webhook 发送到企业的服务器。",
          ],
          links: { sep7: "SEP-7 标准（Stellar）", solanaPay: "Solana Pay 规范", eip681: "EIP-681 标准（Ethereum）" },
        },
        settle: {
          title: "资金在哪里结算",
          body: [
            "结算是资金到达企业的那一刻。使用稳定币时，结算直接在网络上完成：网络确认转账后，支付即为最终结果，无法拒付。退款则是企业发出的一笔新支付。",
          ],
        },
        fees: {
          title: "网络费由谁支付",
          body: [
            "每笔转账都要向其所在的网络支付费用。使用 Cosmos Pay 时，在 Stellar、Solana 和 Monad 上，这笔费用都由付款方的钱包支付。在 Monad 上，每笔支付会进入专为它生成的地址，再由中继转发给企业，中继从该笔付款中扣除自己的费用；API 会在该笔支付的 networkFee 中列明。",
            "网关自身的费用另行计算。Cosmos Pay 按笔收取费率，具体取决于套餐：Starter 为 {starterRate}，无月费。",
          ],
          links: { fees: "价格与费用计算器" },
        },
        custody: {
          title: "托管式与非托管式网关",
          body: [
            "托管式网关将付款收入它所控制的账户，并向您显示余额，您之后再提取。非托管式网关从不持有资金：付款直接进入由您持有密钥的地址。",
            "区别在于：从完成销售到您动用资金之间，由谁掌控这笔资金，以及由谁保管密钥。使用非托管式网关时，密钥由您保管，因此妥善保管密钥也是您自己的责任。",
          ],
        },
        fit: {
          title: "Cosmos Pay 属于哪一类",
          body: [
            "Cosmos Pay 是运行在 Stellar、Solana 和 Monad 上的非托管式稳定币支付网关。您通过支付链接、托管收银台或支付 API 收款，并自行选择收款的钱包地址。Cosmos Pay 不保存任何人的密钥。",
            "在 Stellar 和 Solana 上，客户直接向您的地址付款。在 Monad 上，每笔支付进入为其创建的充值地址，该地址只能将款项转发到您的地址（扣除中继费用）：Cosmos Pay 不持有它的任何密钥。每笔支付都可以在网络上核查，每个已支付的收银台都会附上该交易在公共区块浏览器中的链接。",
          ],
          links: { security: "支付如何受到保护", acceptGuide: "如何在线接受 USDC 支付", integrations: "集成选项" },
        },
      },
      faq: {
        final: { q: "稳定币支付会被拒付吗？", a: "不会。网络一经确认，支付即为最终结果。退款是企业从自己的钱包退回的一笔支付。" },
        custody: { q: "Cosmos Pay 会持有我的资金吗？", a: "不会。在 Stellar 和 Solana 上，付款方直接向您的地址付款。在 Monad 上，每笔支付进入为其创建的充值地址，该地址只能将款项转发到您的地址（扣除中继费用）：Cosmos Pay 不持有它的任何密钥。" },
        wallet: { q: "我需要自己的钱包吗？", a: "需要。在您接受的每个网络上，支付都会进入您掌控的地址，因此从第一笔支付起，资金就归您所有。" },
        customers: { q: "我的客户需要账户吗？", a: "不需要 Cosmos Pay 账户。他们只需要一个位于该支付所在网络、且持有该稳定币的钱包。" },
      },
    },
    networks: {
      nav: "Stellar、Solana 与 Monad 对比",
      title: "Stellar、Solana 与 Monad 收款对比",
      meta: "Stellar、Solana 与 Monad 支付对比 | Cosmos Pay",
      description: "使用 Cosmos Pay 接受稳定币支付时，Stellar、Solana 与 Monad 的对比：链接标准、资产、测试网、网络费和费率。",
      summary: "按 Cosmos Pay 的支持情况并列比较三个网络：链接格式、资产、测试网和费用。",
      lede: "使用 Cosmos Pay 时，无论在 Stellar、Solana 还是 Monad 上，支付都会到达您的地址，并按同样的套餐费率计费。不同之处在于钱包读取的链接（Stellar 上为 SEP-7，Solana 上为 Solana Pay，Monad 上为指向充值地址的 EIP-681）、付款与链接的匹配方式，以及哪些资产有预设。下表按 Cosmos Pay 的支持情况对三者进行比较。",
      table: {
        title: "三个网络并列对比",
        caption: "使用 Cosmos Pay 收款时 Stellar、Solana 与 Monad 的对比",
        topic: "项目",
        rows: {
          link: { k: "支付链接", stellar: "SEP-7（web+stellar:pay）及其二维码", solana: "Solana Pay 转账请求（solana:）及其二维码", monad: "EIP-681（ethereum:）及其二维码，指向专为该笔支付生成的充值地址" },
          match: { k: "付款如何匹配", stellar: "链接上的数字 memo", solana: "链接上的 Solana Pay reference 密钥", monad: "专属充值地址" },
          settle: { k: "款项去向", stellar: "直接进入您的地址", solana: "直接进入您的地址", monad: "充值地址，只能转发到您的地址" },
          fee: { k: "网络费", stellar: "由付款方钱包支付", solana: "由付款方钱包支付", monad: "付款方钱包支付其转账的网络费；转发所需的中继费用从付款中扣除" },
          presets: { k: "预设资产" },
          test: { k: "测试网络" },
          amount: { k: "金额", stellar: "固定，或由付款方自定", solana: "固定，或由付款方自定", monad: "必填" },
          message: { k: "钱包中的消息", stellar: "支持", solana: "支持", monad: "不支持" },
          merchantFee: { k: "在支付上加收您自己的费用", stellar: "付款方提供其账户，在一笔交易中同时支付两者", solana: "包含两笔转账的 Solana Pay 交易请求", monad: "由充值地址拆分付款" },
          wallets: { k: "可付款的钱包", stellar: "任何能打开 SEP-7 链接的钱包，例如 {wallets}", solana: "任何能读取 Solana Pay 链接的钱包，例如 {wallets}", monad: "任何能读取 EIP-681 链接的 EVM 钱包" },
          private: { k: "隐私支付", stellar: "支持，目前仅限 Testnet", solana: "不支持", monad: "不支持" },
          rate: { k: "Cosmos Pay 费率", value: "您套餐的费率（Starter 为 {starterRate}）" },
        },
        note: "预设资产是控制台按名称提供的资产，各网络页面列出了它们的地址。其他任何代币按发行方、铸币地址（mint）或合约指定。",
        links: { sep7: "SEP-7 标准（Stellar）", solanaPay: "Solana Pay 规范", eip681: "EIP-681 标准（Ethereum）" },
      },
      sections: {
        choose: {
          title: "如何选择",
          body: ["一个账户即可在三个网络上收款，每个链接都会指明其结算网络。以下差异决定一笔支付适合哪个网络："],
          points: [
            "在客户已经持有该稳定币的网络上收款。同一套 API 密钥和 Webhook 端点适用于全部三个网络。",
            "如果要让客户自行决定金额（例如捐赠），请使用 Stellar 或 Solana：Monad 链接必须填写金额。",
            "如果要在客户钱包中显示消息（例如订单号），请使用 Stellar 或 Solana。",
            "如果要在链上隐藏金额，可使用隐私支付：它运行在 Stellar 上，目前仅限 Testnet。",
          ],
          links: { stellar: "Stellar 支付", solana: "Solana 支付", monad: "Monad 支付" },
        },
        fees: {
          title: "各网络上的费用",
          body: [
            "Cosmos Pay 按您套餐的费率按笔收费，在 Stellar、Solana 和 Monad 上相同：Starter 为 {starterRate}，无月费。在这三个网络上，网络费都由付款方的钱包支付。在 Monad 上，将付款转发给您的中继费用从该笔付款中扣除，收银台会显示这笔费用。",
          ],
          links: { fees: "价格与费用计算器", compare: "我们的费用对比" },
        },
      },
      faq: {
        all: { q: "我可以在三个网络上都收款吗？", a: "可以。每个支付链接在一个网络上结算，由您在创建时选择。同一个账户、同一套 API 密钥和 Webhook 适用于全部三个网络。" },
        test: { q: "三个网络都能测试吗？", a: "可以。沙箱和测试密钥（dv_）会在 Stellar Testnet、Solana Devnet 和 Monad Testnet 上创建链接。Monad Testnet 没有预设的 USDC：请在那里以 MON 收款，或按合约指定代币。" },
        fees: { q: "Cosmos Pay 在某个网络上更便宜吗？", a: "不会。您套餐的费率在三个网络上都相同。网络费由付款方的钱包支付；在 Monad 上，转发付款的中继费用从该笔付款中扣除。" },
      },
    },
    solanaPay: {
      nav: "通过 Solana Pay 收取 USDC",
      title: "如何通过 Solana Pay 链接接受 USDC",
      meta: "Solana Pay 支付链接：分步指南 | Cosmos Pay",
      description: "通过 Solana Pay 链接和二维码在 Solana 上收取 USDC：链接包含什么、如何在 Devnet 上测试，以及每笔支付如何获得确认。",
      summary: "为 USDC 创建 Solana Pay 链接，在 Devnet 上测试，并在您的服务器上看到每笔支付获得确认。",
      lede: "使用 Cosmos Pay 时，Solana 上的支付链接就是一个 Solana Pay 转账请求：客户扫描其二维码，或在 Phantom、Solflare 等钱包中打开它，并在钱包中确认这笔 USDC 支付。USDC 直接进入您的钱包，Solana 确认交易后，Cosmos Pay 即将该链接标记为已支付。收取真实资金之前，先在 Devnet 上试一试。",
      sections: {
        what: {
          title: "Solana Pay 链接包含什么",
          body: [
            "Solana Pay 是 Solana 钱包能读取的支付请求标准：一个 solana: 链接或其二维码，包含收款地址、金额、代币和一条消息。",
            "Cosmos Pay 会为每个链接生成一个 reference 密钥。钱包会把它写入交易，Cosmos Pay 则在 Solana 上查找该密钥，将付款与其链接匹配。只有当交易成功且准确的金额到达您的地址时，Cosmos Pay 才会接受这笔付款。",
          ],
          links: { solanaPay: "Solana Pay 规范", solana: "Solana 支付" },
        },
        need: {
          title: "您和客户各需要什么",
          points: [
            "您：一个用于收款的 Solana 地址，已在控制台中添加到您的组织，并通过签名证明属于您。",
            "客户：一个能读取 Solana Pay 链接的 Solana 钱包（例如 Phantom 或 Solflare），其中持有 USDC 以及少量用于支付网络费的 SOL。无需 Cosmos Pay 账户。",
            "测试时：使用沙箱，那里的链接运行在 Solana Devnet 上。USDC 在那里同样有预设，因此您可以用 Devnet USDC 进行测试。",
          ],
        },
        api: {
          title: "从服务器创建链接",
          body: [
            "使用支付 API 调用 POST /v1/payment-intents/pay，将 chain 设为 solana，以您的地址作为目标地址；收取 USDC 时，资产代码填 USDC，并以其铸币地址（mint）作为发行方。使用 TypeScript SDK（2.2 或更高版本）时，向 client.paymentIntents.createPay 传入 chain: 'solana'。",
            "响应中包含链接（其 uri 以 solana: 开头）及其二维码。您可以展示二维码、在客户的钱包中打开链接，或将客户引导至托管收银台：payments.cosmospay.lat 后接链接的 ID。",
          ],
          links: { paymentIntents: "支付意图 API", sdkPaymentIntents: "SDK 中的支付意图" },
        },
        know: {
          title: "须知",
          points: [
            "您可以不填金额，由客户自行决定，例如用于捐赠。加收您自己费用的链接必须填写金额。",
            "一条最多 300 个字符的消息（例如订单号）会显示在客户的钱包中。",
            "如果在支付上加收您自己的费用，链接会变为 Solana Pay 交易请求，在一笔交易中同时向您的钱包和您的收费钱包付款。",
            "链接的有效时间有限，收银台会以倒计时显示。如果之后仍有支付到达并获确认，该链接会被标记为已支付。",
            "Solana 网络费由客户的钱包以 SOL 支付。每笔支付按您套餐的费率计费，与其他所有网络相同。",
          ],
          links: { fees: "价格与费用计算器", networksGuide: "Stellar、Solana 与 Monad 对比" },
        },
      },
      steps: {
        title: "接受您的第一笔 Solana Pay 支付",
        items: {
          sandbox: { title: "切换到沙箱", body: "登录控制台，在顶部选择“沙箱”。在那里创建的链接运行在 Solana Devnet 上，不涉及真实资金。" },
          wallet: { title: "添加您的 Solana 钱包", body: "在组织设置中，添加用于收款的 Solana 地址，并签署控制台请求签署的内容，以证明该钱包属于您。" },
          create: { title: "创建链接", body: "在“支付”中选择“创建支付链接”，选择 Solana，并将资产改为 USDC（选择器默认为 SOL）。输入金额，或留空由客户自行决定，然后选择您的钱包，如有需要再添加一条消息。" },
          pay: { title: "用钱包付款", body: "打开收银台页面，用 Solana 钱包扫描其二维码，或在同一设备上打开链接。在钱包中确认支付，Solana 确认后，收银台即变为“已支付”。" },
          confirm: { title: "在服务器上确认", body: "在控制台中添加 Webhook 端点。支付获得确认后，Cosmos Pay 会发送使用 HMAC-SHA256 签名的 PAYMENT_INTENT_SUCCEEDED。请在收到该事件时交付订单。" },
          live: { title: "切换到生产环境", body: "选择“生产环境”，并创建生产 API 密钥（以 prod_ 开头）。链接现在运行在 Solana 主网上，USDC 在那里有自己的预设。" },
        },
        links: { webhooksGuide: "如何在服务器上确认支付", apiKeys: "API 密钥" },
      },
      faq: {
        wallets: { q: "哪些钱包可以支付 Solana Pay 链接？", a: "任何能读取 Solana Pay 链接的 Solana 钱包，例如 Phantom 或 Solflare。客户扫描二维码或打开链接，然后在钱包中确认支付。" },
        sol: { q: "我的客户需要 SOL 吗？", a: "需要，少量即可。除了发送的 USDC 之外，客户的钱包还要以 SOL 支付 Solana 网络费。" },
        direct: { q: "USDC 会经过 Cosmos Pay 吗？", a: "不会。在 Solana 上，客户的钱包将 USDC 直接发送到您的地址。Cosmos Pay 通过链接的 reference 密钥在网络上找到这笔付款。" },
        devnet: { q: "可以不用真实资金测试吗？", a: "可以。在沙箱中并使用测试密钥（dv_）时，链接运行在 Solana Devnet 上，USDC 在那里有预设，收银台也会注明不涉及真实资金。" },
      },
    },
    webhooks: {
      nav: "在服务器上确认支付",
      title: "如何在服务器上确认稳定币支付",
      meta: "用 Webhook 确认稳定币支付 | Cosmos Pay",
      description: "通过签名 Webhook 在服务器上确认稳定币支付：验证签名、快速响应、处理重试与重复事件，并先行测试。",
      summary: "依据签名 Webhook 交付订单，而不是依据客户看到的页面：验证它、快速响应并跳过重复事件。",
      lede: "要确认稳定币支付，请让您的服务器依据 Cosmos Pay 的签名 Webhook 采取行动，而不是依据客户看到的页面。网络确认支付后，Cosmos Pay 会向您的端点发送 PAYMENT_INTENT_SUCCEEDED，并以该端点的签名密钥签名。请验证签名，以 2xx 状态码响应，并且每个事件只交付一次订单。",
      sections: {
        why: {
          title: "为什么要靠服务器，而不是浏览器",
          body: [
            "显示“已支付”的收银台，只是客户浏览器上显示的内容。标签页可能在返回您的网站之前就被关闭，任何人也都可以手动打开您的成功页面。让支付成为最终结果的，是网络的确认。",
            "Cosmos Pay 替您监控网络，并在支付获得确认时通知您的服务器。将订单标记为已支付并交付订单，应当在您的服务器上完成。",
          ],
        },
        how: {
          title: "Cosmos Pay 发送什么",
          points: [
            "向您注册的端点发送一个 HTTPS POST 请求，附带一个 JSON 事件：id（以 evt_ 开头）、type、createdAt 和 data。对于支付，data 就是该笔支付，包括其状态、金额、资产、网络和交易。",
            "X-Cosmos-Signature 请求头：t=<Unix 时间>,v1=<签名>。签名是以端点的签名密钥为密钥，对 t、一个句点和原始请求体计算的 HMAC-SHA256，以十六进制表示。",
            "您选择的事件类型，例如 PAYMENT_INTENT_SUCCEEDED、PAYMENT_INTENT_FAILED 或 ZK_PAYMENT_SUCCEEDED。请按原样匹配：大写字母加下划线。",
            "X-Cosmos-Event、X-Cosmos-Event-Id 和 X-Cosmos-Delivery 请求头，用于标明事件和投递。",
          ],
          links: { webhooks: "SDK 中的 Webhook", webhooksApi: "Webhook API" },
        },
        retries: {
          title: "当您的服务器没有响应时",
          body: [
            "只有 2xx 响应才算投递成功，且不会跟随重定向。投递失败时，Cosmos Pay 会以逐渐拉长的间隔最多重试三次，之后在后续轮次中再次重试，每次尝试中事件的 id 都保持不变。",
            "在控制台中，每个端点都会列出其投递记录，并可筛选失败的投递，您可以重新发送其中任意一条。Cosmos Pay 会将投递的请求体保留 30 天，请在此期间内重新投递。",
          ],
        },
        validate: {
          title: "或者自行核查支付",
          body: [
            "您也可以查询单笔支付：按 ID 获取它以读取其状态，或将其交易哈希（在 Solana 上为交易签名）发送到 POST /v1/payment-intents/:id/validate。请将其作为备用手段，例如客户在 Webhook 到达之前就已返回时；Webhook 仍是主要信号。",
          ],
          links: { paymentIntents: "支付意图 API" },
        },
      },
      steps: {
        title: "一步步设置 Webhook",
        items: {
          endpoint: { title: "添加端点", body: "在控制台中打开“Webhook”，添加您服务器上某个路由的 HTTPS 地址。选择要接收的事件；PAYMENT_INTENT_SUCCEEDED 默认已选中。该地址必须是公开地址：私有地址和本地地址会被拒绝。" },
          secret: { title: "保存签名密钥", body: "控制台只会显示一次端点的签名密钥（以 whsec_ 开头）。请将其保存在服务器的环境变量中，切勿放在网页里。" },
          verify: { title: "验证每个请求", body: "在任何 JSON 解析器处理之前读取原始请求体，并据此校验 X-Cosmos-Signature。使用 TypeScript SDK 时，Webhooks.constructEvent 会校验签名，默认拒绝超过五分钟的签名，并返回事件。" },
          answer: { title: "先快速响应，再处理", body: "签名校验通过后立即以 2xx 状态码响应，发送邮件、更新库存等耗时工作放到之后再做。" },
          dedupe: { title: "每个事件只处理一次", body: "保存您处理过的每个事件的 id，遇到已处理过的事件就跳过：重试或重新投递会再次发送同一个事件。" },
          test: { title: "发送测试", body: "在端点上使用“发送测试”接收一个 ping 事件，然后在沙箱中完成一笔测试支付，并在端点的列表中查看其投递情况。" },
        },
        links: { webhooks: "SDK 中的 Webhook", gettingStarted: "快速入门" },
      },
      faq: {
        name: { q: "控制台显示的是 payment_intent.succeeded。事件实际使用哪个名称？", a: "事件的 type 是 PAYMENT_INTENT_SUCCEEDED，大写字母加下划线。控制台只是以更短的形式显示它。" },
        rotate: { q: "轮换签名密钥后会怎样？", a: "新密钥立即生效，旧密钥立即失效，因此轮换后请马上更新您的服务器。" },
        down: { q: "如果我的服务器宕机了怎么办？", a: "Cosmos Pay 会重试失败的投递，您也可以在 30 天内从控制台重新发送任何一次投递。" },
        several: { q: "可以有多个端点吗？", a: "可以。每个端点都有自己的地址、事件和签名密钥，每个事件都会发送到订阅了它的每个端点。" },
      },
    },
    usdt0: {
      nav: "从 Stellar 发送 USDT0",
      title: "如何从 Stellar 向 EVM 网络发送 USDT0",
      meta: "从 Stellar 向 EVM 网络发送 USDT0 | Cosmos Pay",
      description: "使用 Cosmos Pay 从 Stellar 账户向 Ethereum、Arbitrum 及其他 EVM 网络发送 USDT0：路线、以 XLM 计的费用、所需时间和每个步骤。",
      summary: "通过 LayerZero 将 USDT0 从 Stellar 转到 EVM 网络：选择路线、查看费用、签名一次并跟踪送达。",
      lede: "使用 Cosmos Pay，您可以把 USDT0 从 Stellar 账户发送到 Ethereum、Arbitrum 或其他 EVM 网络（共 21 个）上的地址。您会得到一份以 XLM 列出全部费用的报价，在钱包中签署一笔 Stellar 交易，转账约 27 分钟后到账。Ethereum 收到的是原生 USDT；其他所有网络收到的是 USDT0。",
      sections: {
        what: {
          title: "什么是 USDT0",
          body: [
            "USDT0 是 Tether 的 USDT 的全链形式。其发行方描述了一种锁定并铸造（lock-and-mint）的设计：USDT 锁定在 Ethereum 上，在其他网络上铸造等量的 USDT0，这些网络之间通过 LayerZero 的全链同质化代币（OFT）标准转移它。",
            "在 Stellar 上，USDT0 与其他资产无异，因此发送它的账户需要该资产的信任线以及 USDT0 余额。",
          ],
          links: { usdt0Site: "发行方官网上的 USDT0", usdt0Network: "USDT0 网络如何运作", layerzeroOft: "LayerZero 的 OFT 标准" },
        },
        routes: {
          title: "可以发送到哪里",
          body: [
            "Cosmos Pay 提供 21 条路线，全部通往 EVM 网络，每条都发送到由 0x 加 40 个十六进制字符组成的地址。Ethereum 收到的是原生 USDT；Arbitrum 及其他网络收到的是 USDT0。API 的 routes 调用会列出这些路线及其名称。",
            "转账仅在主网上运行：使用测试密钥（dv_）时，API 会返回没有可用路线。",
          ],
          links: { usdt0Docs: "SDK 中的 USDT0", usdt0Api: "USDT0 API" },
        },
        cost: {
          title: "费用是多少",
          points: [
            "LayerZero 的消息费，以 XLM 支付。交易最多允许多出 20%，未用完的部分会在同一笔交易中退回。",
            "Stellar 网络费，以 XLM 支付。",
            "Cosmos Pay 的佣金（如有），报价会在您签名前显示。",
            "发送账户以 XLM 支付以上全部费用，因此除了 USDT0 之外，还请在该账户中保留一些 XLM。",
          ],
        },
        know: {
          title: "须知",
          points: [
            "交易的有效期很短，由 expiresAt 给出：请在此之前签名并提交，否则需要创建新的转账。",
            "Stellar 金额有 7 位小数，而 OFT 只携带 6 位，因此第 7 位小数会作为零头（dust）留在您的账户中。",
            "Cosmos Pay 从不持有任何密钥：API 构建交易，您的钱包签名，再由 API 转发。",
            "您也可以在控制台的兑换面板中发送 USDT0，它在那里显示为“USDT0 跨链”。",
          ],
        },
      },
      steps: {
        title: "一步步发送 USDT0",
        items: {
          hold: { title: "在 Stellar 上持有 USDT0", body: "发送账户需要 USDT0 的信任线、USDT0 余额，以及一些用于支付费用的 XLM。" },
          quote: { title: "获取报价", body: "用路线和金额调用 quote。它会返回发送的金额、到账的金额、留下的零头、每项费用和限额，且不保存任何内容。" },
          create: { title: "创建转账", body: "用发送方 Stellar 账户、路线、接收方 EVM 地址和金额调用 create。API 会为此构建一笔 Stellar 交易。" },
          sign: { title: "在钱包中签名", body: "用持有 USDT0 的钱包签署该交易（其 XDR），或在该钱包中打开其 SEP-7 链接。" },
          submit: { title: "提交交易", body: "将签名后的交易发送到 submit。如果网络拒绝该交易，转账会保持待处理状态：请排除原因，并在过期前重新提交。" },
          follow: { title: "跟踪直至送达", body: "转账会依次经历 PENDING、SUBMITTED 和 DELIVERED，每条路线约需 27 分钟，期间 LayerZero 的验证者会等待 Stellar 的确认。送达后，转账会附带目标网络上的交易和一个 LayerZero Scan 链接。" },
        },
        links: { usdt0Docs: "SDK 中的 USDT0", usdt0Api: "USDT0 API" },
      },
      faq: {
        arrive: { q: "接收地址会收到什么？", a: "在 Ethereum 上是原生 USDT。在其他所有路线上是 USDT0。" },
        time: { q: "一笔转账需要多长时间？", a: "每条路线约 27 分钟，以 LayerZero Scan 上的测量为准：LayerZero 的验证者会等待 Stellar 的确认，之后转账才会送达。" },
        test: { q: "可以在测试网上试用吗？", a: "不可以。USDT0 转账仅在主网上运行；使用测试密钥时没有可用路线。" },
        custody: { q: "Cosmos Pay 会持有我的 USDT0 吗？", a: "不会。发送它的交易由您的钱包签名；Cosmos Pay 只负责构建和转发。" },
      },
    },
  },
};

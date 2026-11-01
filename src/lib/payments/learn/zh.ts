/* The gateway's guides in Simplified Chinese. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const zh: LearnMessages = {
  hub: {
    nav: "指南",
    title: "稳定币支付指南",
    lede: "为使用 Cosmos Pay 收取稳定币的企业准备的指南：如何在线接受 USDC 支付，如何在 WhatsApp 上发送支付链接，稳定币支付网关有什么作用，以及 Stellar、Solana 与 Monad 的对比。",
    meta: "稳定币支付指南 | Cosmos Pay",
    description: "面向企业的指南：在线接受 USDC 支付、在 WhatsApp 上发送支付链接、稳定币支付网关如何运作，以及 Stellar、Solana 与 Monad 的对比。",
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
            "在 Stellar 和 Solana 上，客户直接向您的地址付款。在 Monad 上，每笔支付进入各自的充值地址，再由它转发到您的地址。每笔支付都可以在网络上核查，每个已支付的收银台都会附上该交易在公共区块浏览器中的链接。",
          ],
          links: { security: "支付如何受到保护", acceptGuide: "如何在线接受 USDC 支付", integrations: "集成选项" },
        },
      },
      faq: {
        final: { q: "稳定币支付会被拒付吗？", a: "不会。网络一经确认，支付即为最终结果。退款是企业从自己的钱包退回的一笔支付。" },
        custody: { q: "Cosmos Pay 会持有我的资金吗？", a: "不会。在 Stellar 和 Solana 上，付款方直接向您的地址付款。在 Monad 上，每笔支付进入各自的充值地址，扣除网络费后再转发到您的地址。" },
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
          settle: { k: "款项去向", stellar: "直接进入您的地址", solana: "直接进入您的地址", monad: "由充值地址转发到您的地址" },
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
  },
};

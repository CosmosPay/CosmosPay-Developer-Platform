/* The gateway's guides in Simplified Chinese. Mirrors src/lib/payments/learn/en.ts key for key. */
import type { LearnMessages } from "@/lib/payments/learn/en";

export const zh: LearnMessages = {
  hub: {
    nav: "指南",
    title: "稳定币支付指南",
    lede: "为使用 Cosmos Pay 收取稳定币的企业准备的指南：如何在线以及在各个网络上接受 USDC 支付（Stellar 使用 SEP-7，Solana 使用 Solana Pay，Monad 使用 EIP-681），如何在网站上添加支付按钮，如何以任意金额接受捐赠，如何在 WhatsApp 上发送支付链接，如何在服务器上确认支付，稳定币支付网关有什么作用，三个网络的对比，如何跨链兑换，以及如何从 Stellar 向 EVM 网络发送 USDT0。",
    meta: "稳定币支付指南 | Cosmos Pay",
    description: "指南：在线及在各个网络上接受 USDC、支付按钮、捐赠、Webhook、WhatsApp 支付链接、跨链兑换，以及从 Stellar 发送 USDT0。",
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
    stellarHowTo: {
      nav: "在 Stellar 上收取 USDC",
      title: "如何通过 SEP-7 链接在 Stellar 上接受 USDC",
      meta: "Stellar SEP-7 支付链接：分步指南 | Cosmos Pay",
      description: "通过 SEP-7 链接和二维码在 Stellar 上收取 USDC：您的账户需要的信任线、如何在 Testnet 上测试，以及每笔付款如何匹配。",
      summary: "通过 SEP-7 链接在 Stellar 上收取 USDC：准备好您的账户，在 Testnet 上测试，并看到每笔支付获得确认。",
      lede: "使用 Cosmos Pay 时，Stellar 上的支付链接就是一个 SEP-7 请求：客户扫描其二维码，或在 Freighter、LOBSTR、xBull 等钱包中打开它，并在钱包中确认这笔 USDC 支付。USDC 直接进入您的 Stellar 账户，Cosmos Pay 通过链接的 memo 找到这笔付款后，即将该链接标记为已支付。您的账户必须已建立 USDC 信任线，才能接收 USDC。",
      sections: {
        what: {
          title: "SEP-7 链接包含什么",
          body: [
            "SEP-7 是 Stellar 的支付请求标准：一个 web+stellar:pay 链接或其二维码，包含您的地址、金额、资产及其发行方，以及一个数字 memo。",
            "Cosmos Pay 会为每个链接生成一个 memo，并在您账户收到的付款中查找它。只有同时满足以下条件的付款才会被接受：带有该 memo、付到您的地址、使用链接指定的资产、在链接创建之后发出，且在链接设定了金额时与该金额完全一致。",
          ],
          links: { sep7: "SEP-7 标准（Stellar）", stellar: "Stellar 支付" },
        },
        prepare: {
          title: "准备您的账户",
          points: [
            "您的 Stellar 账户必须已在网络上存在，并已建立 USDC 信任线，才能接收 USDC。添加账户时 Cosmos Pay 不会检查这一点；向没有该信任线的账户付款，会在客户签名后失败。",
            "在控制台中将该账户添加到您的组织，并签署控制台请求签署的内容，以证明该账户属于您。",
            "测试时，在 Testnet 上执行同样的操作。Testnet 的水龙头 Friendbot 可以向账户发送测试 XLM，链接在那里也可以用 XLM 收款。",
          ],
        },
        payer: {
          title: "您的客户需要什么",
          points: [
            "一个能打开 SEP-7 链接的 Stellar 钱包（例如 Cosmos Pay Wallet、Freighter、LOBSTR、xBull、Albedo 或 Rabet），其中持有 USDC 以及少量用于支付网络费的 XLM。无需 Cosmos Pay 账户。",
            "一笔直接的 USDC 付款。如果钱包在途中将其他资产兑换成 USDC（即路径支付，path payment），这笔付款无法完成该链接的支付。",
            "在 Testnet 上，付款前须先将钱包切换到 Testnet：链接不注明网络，遵循 SEP-7 的钱包因此会默认使用主网。",
          ],
        },
        api: {
          title: "从服务器创建链接",
          body: [
            "调用 POST /v1/payment-intents/pay，以您的账户作为目标地址并填写金额；收取 USDC 时，填写资产代码及其发行方。也可以使用 TypeScript SDK 中的 client.paymentIntents.createPay：chain 默认为 Stellar。响应中包含链接（其 uri 以 web+stellar:pay 开头）及其二维码。",
            "如果您知道客户的账户，交易意图（POST /v1/payment-intents/tx，或 SDK 中的 createTx）会改为返回一笔未签名的交易，供客户签署。该交易必须在五分钟内签署。",
            "如果您自行设置 memo，请只将它用于一笔支付：同一 memo 搭配不同条件会被拒绝。",
          ],
          links: { paymentIntents: "支付意图 API", sdkPaymentIntents: "SDK 中的支付意图" },
        },
        know: {
          title: "须知",
          points: [
            "您可以不填金额，由客户自行决定。一条最多 300 个字符的消息会显示在客户的钱包中。",
            "如果在支付上加收您自己的费用，收银台会请客户提供其账户，并构建一笔同时向您和您的收费钱包付款的交易。",
            "在控制台中，待处理的 Stellar 链接提供一项核查，可凭交易哈希完成该链接的支付。",
            "链接过期后才到达的付款，可将其交易哈希发送到 POST /v1/payment-intents/:id/validate 来完成该链接的支付。",
            "Stellar 网络费由客户的钱包以 XLM 支付。隐私支付会在链上隐藏金额，它在 Stellar 上以 XLM 运行，目前仅限 Testnet。",
          ],
          links: { fees: "价格与费用计算器", networksGuide: "Stellar、Solana 与 Monad 对比" },
        },
      },
      steps: {
        title: "在 Stellar 上接受您的第一笔 USDC 支付",
        items: {
          sandbox: { title: "切换到沙箱", body: "登录控制台，在顶部选择“沙箱”。在那里创建的链接运行在 Stellar Testnet 上，不涉及真实资金。" },
          wallet: { title: "添加您的 Stellar 账户", body: "确认该账户已存在并已建立 USDC 信任线，然后在组织设置中添加它，并签署控制台请求签署的内容。" },
          create: { title: "创建链接", body: "在“支付”中选择“创建支付链接”，选择 Stellar、金额（也可不填）和 USDC，然后选择您的账户，如有需要再添加一条消息。" },
          pay: { title: "用钱包付款", body: "打开收银台页面，用已切换到同一网络的 Stellar 钱包扫描其二维码，或在同一设备上打开链接。确认支付后，Cosmos Pay 找到这笔付款，收银台即变为“已支付”。" },
          confirm: { title: "在服务器上确认", body: "在控制台中添加 Webhook 端点。支付获得确认后，Cosmos Pay 会发送使用 HMAC-SHA256 签名的 PAYMENT_INTENT_SUCCEEDED。请在收到该事件时交付订单。" },
          live: { title: "切换到生产环境", body: "选择“生产环境”，并创建生产 API 密钥（以 prod_ 开头）。链接现在运行在 Stellar 主网上，那里预设的是 Circle 发行的 USDC。" },
        },
        links: { webhooksGuide: "如何在服务器上确认支付", apiKeys: "API 密钥" },
      },
      faq: {
        trustline: { q: "为什么向我的账户付款失败了？", a: "最常见的原因是收款账户缺少 USDC 信任线。请添加信任线，然后创建新的链接并重新发送。" },
        wallets: { q: "哪些钱包可以支付 SEP-7 链接？", a: "任何能打开 SEP-7 链接的 Stellar 钱包，例如 Cosmos Pay Wallet、Freighter、LOBSTR、xBull、Albedo 或 Rabet。" },
        convert: { q: "客户可以用 XLM 支付 USDC 链接吗？", a: "不可以。只有直接的 USDC 付款才能完成该链接的支付：在途中将 XLM 兑换成 USDC 的付款不行。" },
        test: { q: "可以不用真实资金测试吗？", a: "可以。在沙箱中并使用测试密钥（dv_）时，链接运行在 Stellar Testnet 上，USDC 在那里有预设，Friendbot 也会发送测试 XLM。" },
      },
    },
    monadHowTo: {
      nav: "在 Monad 上收取 USDC",
      title: "如何通过 EIP-681 链接在 Monad 上接受 USDC",
      meta: "Monad EIP-681 支付链接：分步指南 | Cosmos Pay",
      description: "通过 EIP-681 链接和二维码在 Monad 上收取 USDC：为每笔支付生成的充值地址、所需的金额、测试和确认。",
      summary: "在 Monad 上通过 EIP-681 链接收取 USDC，付款进入专为该笔支付生成的充值地址，您可以看到它获得确认。",
      lede: "使用 Cosmos Pay 时，Monad 上的支付链接就是一个指向专为该笔支付生成的充值地址的 EIP-681 请求：客户用 EVM 钱包扫描其二维码，并确认这笔 USDC 转账。充值地址只能将款项转发到您的地址，转发完成后，Cosmos Pay 即将该链接标记为已支付。每个 Monad 链接都必须填写金额。",
      sections: {
        what: {
          title: "EIP-681 链接包含什么",
          body: [
            "EIP-681 是 EVM 钱包能读取的 Ethereum 支付请求标准：一个 ethereum: 链接或其二维码，包含代币、网络和金额。Monad 主网的 chain ID 为 143，其 Testnet 为 10143。",
            "该链接付款到专为这笔支付生成的充值地址，而不是直接付到您的地址。该地址的代码只能将收到的款项发送到您的地址，因此 Cosmos Pay 不持有任何能把资金转到别处的密钥。",
          ],
          links: { eip681: "EIP-681 标准（Ethereum）", monad: "Monad 支付" },
        },
        deposit: {
          title: "充值地址如何向您付款",
          points: [
            "Cosmos Pay 会监控充值地址。一旦其中至少持有该金额，中继就会将款项转发到您的地址，这次转发即完成该链接的支付。",
            "中继可能会从付款中扣除一笔转发费用。收银台会显示这笔费用，API 也会在该笔支付的 networkFee 中列明。",
            "超出金额的付款会全额转发给您。低于金额的付款无法完成该链接的支付。",
            "客户的钱包以 MON 支付其自身转账的 Monad 网络费。",
          ],
        },
        api: {
          title: "从服务器创建链接",
          body: [
            "调用 POST /v1/payment-intents/pay，将 chain 设为 monad，以您的地址作为目标地址并填写金额；收取 USDC 时，填写资产代码，并以其合约作为发行方。也可以向 TypeScript SDK（2.2 或更高版本）中的 client.paymentIntents.createPay 传入 chain: 'monad'。响应中包含链接（其 uri 以 ethereum: 开头）及其二维码。",
            "Monad 链接不支持消息。若要在转发到账之前确认一笔支付，请将客户的交易哈希（0x 加 64 个十六进制字符）发送到 POST /v1/payment-intents/:id/validate。",
          ],
          links: { paymentIntents: "支付意图 API", sdkPaymentIntents: "SDK 中的支付意图" },
        },
        know: {
          title: "须知",
          points: [
            "链接的有效时间有限。之后仍到达的足额付款会被转发给您，并将该链接标记为已支付。",
            "向同一充值地址的其他付款也会被转发到您的地址。",
            "如果在支付上加收您自己的费用，充值地址会拆分付款：您的费用进入您的收费钱包，其余款项转给您。",
            "每笔支付按您套餐的费率计费，与其他所有网络相同。",
          ],
          links: { fees: "价格与费用计算器", networksGuide: "Stellar、Solana 与 Monad 对比" },
        },
      },
      steps: {
        title: "在 Monad 上接受您的第一笔 USDC 支付",
        items: {
          sandbox: { title: "切换到沙箱", body: "登录控制台，在顶部选择“沙箱”。在那里创建的链接运行在 Monad Testnet 上，该网络没有预设的 USDC：请以 MON 收款，或按合约指定代币。" },
          wallet: { title: "添加您的 Monad 地址", body: "在组织设置中，添加将在 Monad 上收款的 EVM 地址，并签署控制台请求签署的内容，以证明该地址属于您。" },
          create: { title: "创建链接", body: "在“支付”中选择“创建支付链接”，选择 Monad，输入金额（必填）并选择资产，然后选择您的地址。" },
          pay: { title: "用钱包付款", body: "打开收银台页面，在同一网络上用能读取 EIP-681 链接的 EVM 钱包扫描其二维码。确认转账后，款项一转发给您，收银台即变为“已支付”。" },
          confirm: { title: "在服务器上确认", body: "在控制台中添加 Webhook 端点。支付获得确认后，Cosmos Pay 会发送使用 HMAC-SHA256 签名的 PAYMENT_INTENT_SUCCEEDED。请在收到该事件时交付订单。" },
          live: { title: "切换到生产环境", body: "选择“生产环境”，并创建生产 API 密钥（以 prod_ 开头）。链接现在运行在 Monad 主网上，USDC 在那里有自己的预设。" },
        },
        links: { webhooksGuide: "如何在服务器上确认支付", apiKeys: "API 密钥" },
      },
      faq: {
        why: { q: "为什么链接付款到充值地址，而不是我的地址？", a: "每笔支付都有自己的地址，因此 Cosmos Pay 无需 memo 即可区分各笔付款。该地址只能将收到的款项转发到您的地址。" },
        fees: { q: "在 Monad 上由谁支付费用？", a: "客户的钱包支付其转账的网络费。中继的转发费用（如有）从付款中扣除，并显示在收银台上。" },
        amount: { q: "客户可以自行决定金额吗？", a: "不可以。Monad 链接必须填写金额。如需由客户决定金额，请使用 Stellar 或 Solana 链接。" },
        test: { q: "可以在 Monad 上测试吗？", a: "可以。在沙箱中并使用测试密钥（dv_）时，链接运行在 Monad Testnet 上。那里没有预设的 USDC，因此请以 MON 收款，或按合约指定代币。" },
      },
    },
    embed: {
      nav: "网站上的支付按钮",
      title: "如何在网站上添加加密货币支付按钮或收银台",
      meta: "在网站上添加加密货币支付按钮 | Cosmos Pay",
      description: "只需一个 script 标签，页面中无需 API 密钥，即可在任何网站上添加支付按钮或嵌入式收银台：属性、事件、CSP 和测试。",
      summary: "加载一个脚本，为支付链接添加支付按钮或嵌入式收银台，并在服务器上确认支付。",
      lede: "要在您自己的网站上收取稳定币支付，只需加载一次 Cosmos Pay 嵌入脚本，并添加一个带有支付链接 ID 的 cosmos-pay-button 或 cosmos-pay-checkout 元素。按钮会在弹出窗口中打开托管收银台，嵌入式收银台则直接在您的页面中显示支付。页面无需 API 密钥，您的服务器通过签名 Webhook 确认支付。",
      sections: {
        what: {
          title: "按钮还是嵌入式收银台",
          points: [
            "支付按钮（cosmos-pay-button）会在页面中央的弹出窗口中打开托管收银台。如果浏览器拦截了弹出窗口，则改为在当前标签页中跳转到收银台。",
            "嵌入式收银台（cosmos-pay-checkout）直接在您的页面中显示支付，宽度最多 420 像素：金额、二维码、一个用于打开付款方钱包的按钮，以及实时状态。",
            "两者都适用于 Stellar、Solana 和 Monad 上的支付链接，支持英语、西班牙语、葡萄牙语、法语、德语、印地语和中文。",
          ],
        },
        link: {
          title: "链接从哪里来",
          body: [
            "每个元素显示一个支付链接，通过 link 属性中的 ID 指定。您可以在控制台中创建链接，也可以在客户结账时从您的服务器使用支付 API 或 TypeScript SDK 创建，然后将其 ID 放入页面。页面无需 API 密钥即可读取链接，因此您的密钥始终留在服务器上。",
            "每笔支付显示一个嵌入式收银台：一个链接只能支付一次。",
          ],
          links: { paymentLinks: "支付链接 API", acceptGuide: "如何在线接受 USDC 支付" },
        },
        options: {
          title: "属性与样式",
          points: [
            "link：支付链接的 ID。必填。",
            "lang：语言，例如 es 或 es-AR。默认使用付款方的浏览器语言，否则为英语。",
            "theme：light（默认）、dark，或跟随付款方系统设置的 auto。",
            "demo：显示一个无法支付、也不发送任何请求的示例，用于演示。",
            "按钮内的文字会替换其标签，您的 CSS 可以通过 ::part(button) 和 ::part(card) 重新设置元素的样式。",
          ],
        },
        confirm: {
          title: "事件与确认支付",
          body: [
            "两个元素都会在您的页面上触发 cosmospay:status 和 cosmospay:paid 事件，附带链接的 ID 和状态。请用它们更新付款方看到的内容，而不要据此交付订单：页面中的事件可能被伪造。",
            "请在服务器收到 PAYMENT_INTENT_SUCCEEDED 时交付订单，这是网络确认支付后 Cosmos Pay 发送的签名 Webhook。如果您的页面发送值为 same-origin 的 Cross-Origin-Opener-Policy，或弹出窗口被拦截，按钮将不会发送任何事件。",
          ],
          links: { webhooksGuide: "如何在服务器上确认支付" },
        },
      },
      steps: {
        title: "一步步添加支付按钮",
        items: {
          script: { title: "加载脚本", body: "在页面中添加一次 script 标签：https://payments.cosmospay.lat/embed/cosmos-pay.js，并带上 defer 属性。" },
          link: { title: "获取支付链接", body: "在控制台中创建链接，或在客户结账时从您的服务器创建，并保存其 ID。" },
          element: { title: "添加元素", body: "编写一个 cosmos-pay-button 或 cosmos-pay-checkout 元素，将 link 设为该 ID，如有需要再设置 lang 或 theme。" },
          csp: { title: "在 CSP 中放行", body: "如果您的网站发送内容安全策略（Content Security Policy），请允许 script-src https://payments.cosmospay.lat、connect-src https://api.cosmospay.lat 和 img-src data:。" },
          test: { title: "测试", body: "使用在沙箱中创建的链接：嵌入式收银台会注明它运行在测试网上。demo 属性无需任何链接即可显示示例。" },
          confirm: { title: "在服务器上确认", body: "添加 Webhook 端点，并在收到 PAYMENT_INTENT_SUCCEEDED 时交付订单。" },
        },
        links: { embed: "嵌入支付（文档）", webhooks: "Webhook" },
      },
      faq: {
        key: { q: "页面需要我的 API 密钥吗？", a: "不需要。这些元素无需密钥即可读取支付链接。请在服务器上创建链接，密钥也留在那里。" },
        iframe: { q: "嵌入式收银台是 iframe 吗？", a: "不是。它在您的页面中以自己的 shadow DOM 绘制，因此无需 frame-src 规则。托管收银台本身不能被嵌入框架。" },
        reuse: { q: "一个按钮可以收取多笔支付吗？", a: "不可以。一个链接只能支付一次，因此请为每笔支付使用单独的链接，例如在客户结账时在服务器上创建。" },
        sites: { q: "它适用于任何网站吗？", a: "是的，适用于任何能加载脚本的页面，只要其内容安全策略允许该脚本、API 和 data: 图片。" },
      },
    },
    crossChain: {
      nav: "跨链兑换",
      title: "如何在 Stellar、Solana 和 Monad 之间兑换代币",
      meta: "在 Stellar、Solana 和 Monad 之间兑换代币 | Cosmos Pay",
      description: "通过 Cosmos Pay 和 NEAR Intents，在 Stellar、Solana、Monad 及另外 32 个网络之间兑换代币：报价、充值、费用、退款和所需时间。",
      summary: "获取兑换报价、发送充值并跟踪直至送达：通过 NEAR Intents 进行的跨链兑换，失败时会在来源链上退款。",
      lede: "Cosmos Pay 可以在 Stellar、Solana、Monad 以及 NEAR Intents 覆盖的其他网络之间兑换代币，共 35 个网络。您先获取报价，在报价过期前将输入金额发送到充值地址，输出金额随即到达您在另一个网络上的地址。如果兑换无法完成，输入金额会退回到您在发送网络上的地址。",
      sections: {
        how: {
          title: "跨链兑换如何运作",
          points: [
            "报价：API 向 NEAR Intents 询价，并返回您发送的金额、扣除所有费用后您收到的金额，以及您套餐的佣金。报价不会保存任何内容。",
            "创建：实时报价会给出一个充值地址（在 Stellar 上附带 memo）、一个带二维码的支付链接，以及一个截止时间，默认 30 分钟。",
            "充值：在截止时间前将输入金额发送到该地址。您也可以向 API 报告这笔充值。",
            "送达：兑换依次经历“已检测到充值”和“处理中”，直至“成功”，即输出金额到达您的地址。",
          ],
        },
        refunds: {
          title: "未能完成时",
          points: [
            "无法完成的兑换会退款到您提供的退款地址，即您发送时所在的网络上。",
            "报价过期并不意味着结束：之后仍到达的充值会被退回。Cosmos Pay 会在 24 小时内继续监控已过期的兑换。",
            "最终状态为“成功”、“已退款”和“失败”。",
          ],
        },
        fees: {
          title: "费用是多少",
          body: [
            "报价会以您发送的资产显示 Cosmos Pay 的佣金：即您套餐的兑换费率，Starter 和公开兑换页面为 0.65%，Enterprise 低至 0.07%。报价中您收到的金额已扣除所有费用，包括网络和服务商成本。",
            "滑点默认为 1%，最高 5%。",
          ],
          links: { fees: "价格与费用计算器" },
        },
        where: {
          title: "在哪里兑换",
          points: [
            "在公开兑换页面上，无需账户：它使用共享的公开密钥，按 0.65% 的费率收费。",
            "在控制台的兑换面板中，生产环境下。",
            "通过 API（/v1/cross-chain-swaps），或使用 TypeScript SDK 中的 client.crossChainSwaps，它支持 Stellar、Solana 和 Monad。",
            "仅限主网：测试密钥（dv_）可以列出资产和获取报价，但不能创建兑换。",
          ],
          links: { swaps: "兑换页面", crossChainApi: "跨链兑换 API" },
        },
      },
      steps: {
        title: "完成您的第一笔跨链兑换",
        items: {
          route: { title: "选择路线", body: "选择您发送的资产和想要的资产（各自位于其网络上），以及接收输出金额的地址。" },
          quote: { title: "获取报价", body: "用金额和发送网络上的退款地址请求报价。核对到账金额和佣金。" },
          create: { title: "创建兑换", body: "根据报价创建兑换。您会得到充值地址（在 Stellar 上附带 memo）、需发送的金额和截止时间。" },
          send: { title: "发送充值", body: "在截止时间前，从您的钱包将输入金额发送到充值地址。" },
          follow: { title: "跟踪进度", body: "获取该兑换，或在控制台中查看，直到其成功。Webhook 会将每个跨链兑换事件通知您的服务器。" },
        },
        links: { crossChainApi: "跨链兑换 API", webhooksGuide: "如何在服务器上确认支付" },
      },
      faq: {
        networks: { q: "我可以在哪些网络之间兑换？", a: "Stellar、Solana、Monad 以及 NEAR Intents 覆盖的其他网络，共 35 个。同一网络内的交易对则属于同链兑换。" },
        test: { q: "可以测试跨链兑换吗？", a: "不能在测试网上测试：这类兑换仅在主网上运行。测试密钥可以列出资产和获取报价。" },
        refund: { q: "如果兑换失败，我的资金会怎样？", a: "资金会退回到您提供的退款地址，即您发送时所在的网络上。" },
        account: { q: "我需要账户吗？", a: "在公开兑换页面上不需要。使用您自己的账户时，控制台和 API 会按您套餐的费率计费。" },
      },
    },
    donations: {
      nav: "加密货币捐赠",
      title: "如何以任意金额接受加密货币捐赠",
      meta: "以任意金额接受加密货币捐赠 | Cosmos Pay",
      description: "通过 Stellar 或 Solana 上的任意金额链接接受稳定币捐赠：捐赠者在钱包中自行选择金额。了解其运作方式与限制。",
      summary: "让每位捐赠者自行选择金额：Stellar 和 Solana 上的任意金额链接，为每位捐赠者单独创建，并通过 Webhook 确认。",
      lede: "要接受稳定币捐赠，请在 Stellar 或 Solana 上创建一个不填金额的支付链接：捐赠者打开链接，在钱包中选择金额，并直接付款到您的地址。每个链接只接受一笔支付，且有效时间有限，因此请为每位捐赠者创建一个链接，例如在有人点击您网站上的“捐赠”时创建。网络确认捐赠后，Cosmos Pay 即将该链接标记为已支付。",
      sections: {
        how: {
          title: "任意金额链接如何运作",
          points: [
            "在控制台中或通过 API 创建链接时，将金额留空。收银台会显示“任意金额”，并提示捐赠者在钱包中选择金额。",
            "金额由捐赠者的钱包决定：链接所设资产的任何正数金额都能完成该链接的支付，在 Stellar 上需附带链接的 memo。",
            "一条最多 300 个字符的消息（例如感谢语）会显示在捐赠者的钱包中。",
          ],
        },
        limits: {
          title: "需要预先考虑的限制",
          points: [
            "仅限 Stellar 和 Solana：Monad 链接必须填写金额。",
            "一个链接只接受一笔捐赠。支付后无法再次支付，因此印在海报上的单个链接只能服务第一位捐赠者。",
            "链接的有效时间有限，收银台会以倒计时显示。",
            "在支付上加收您自己的费用需要固定金额，因此不适用于任意金额链接。",
          ],
        },
        amount: {
          title: "查看捐赠金额",
          body: [
            "任意金额链接不记录金额：链接被支付时，Cosmos Pay 会记录交易哈希和捐赠者的地址，Webhook 也会携带这些信息。请从网络上的该笔交易读取捐赠金额，例如用于感谢捐赠者或开具收据。",
          ],
          links: { webhooksGuide: "如何在服务器上确认支付" },
        },
        site: {
          title: "网站上的“捐赠”按钮",
          body: [
            "当访客点击“捐赠”时，让您的服务器创建一个任意金额链接，并用嵌入式收银台显示它，或将访客引导至其收银台页面。这样每位访客都会得到一个新链接。在浏览器中，Stellar 钱包也可以通过 SDK 的 WebClient，按捐赠者选择的金额支付该链接：webClient.pay(intent, { amount })。",
          ],
          links: { embedGuide: "在网站上添加支付按钮或收银台", paymentIntents: "支付意图 API" },
        },
      },
      steps: {
        title: "接受您的第一笔捐赠",
        items: {
          sandbox: { title: "切换到沙箱", body: "在控制台中选择“沙箱”：链接运行在 Stellar Testnet 或 Solana Devnet 上，不涉及真实资金。" },
          create: { title: "创建任意金额链接", body: "在“支付”中选择“创建支付链接”，选择 Stellar 或 Solana 以及资产，将金额留空，如有需要再添加一条感谢消息。" },
          share: { title: "分享链接", body: "发送收银台页面、展示其二维码，或将其嵌入您的页面。" },
          give: { title: "用钱包捐赠", body: "在同一网络的钱包中打开链接，输入金额并确认。网络确认后，收银台即变为“已支付”。" },
          confirm: { title: "在服务器上确认", body: "收到 PAYMENT_INTENT_SUCCEEDED 后，读取交易以获知金额，并感谢捐赠者。" },
        },
        links: { webhooks: "Webhook", embed: "嵌入支付（文档）" },
      },
      faq: {
        once: { q: "一个链接可以收取多笔捐赠吗？", a: "不可以。一个链接只能支付一次。请为每位捐赠者创建新链接，例如在有人点击“捐赠”时从您的服务器创建。" },
        monad: { q: "可以在 Monad 上接受任意金额的捐赠吗？", a: "不可以。Monad 链接必须填写金额。如需任意金额，请使用 Stellar 或 Solana。" },
        amount: { q: "如何知道捐赠了多少？", a: "在网络上读取该笔支付的交易：对于任意金额支付，链接本身不记录金额。" },
        assets: { q: "捐赠者可以捐赠哪些资产？", a: "链接上设定的资产，例如 USDC 或该网络的原生币（XLM 或 SOL）。捐赠者只选择金额。" },
      },
    },
  },
};

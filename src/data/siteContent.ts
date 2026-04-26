export type NavigationGroup = {
  label: string
  href: string
  children?: Array<{
    label: string
    href: string
  }>
}

export type HeroContent = {
  eyebrow: string
  title: string
  supportText: string
  leftImage: string
  heroImage: string
  centerAccentImage: string
  logoImage: string
}

export type ThemeSection = {
  id: string
  title: string
  lead?: string
  body: string[]
  cta: {
    label: string
    href: string
  }[]
}

export type FooterContent = {
  title: string
  items: string[]
}

export const siteMeta = {
  title: '多元宇宙：残障、科技与共建未来',
}

export const navigationGroups: NavigationGroup[] = [
  { label: '首页', href: '/' },
  {
    label: '无限身心',
    href: '/#unrestricted-bodyminds',
    children: [
      { label: '残障的书写技术', href: '/unrestrictedbodyminds' },
      { label: '触觉的可能性', href: '/unrestrictedbodyminds' },
      { label: '赛博格的前世今生', href: '/unrestrictedbodyminds' },
      { label: '障碍是一种处境', href: '/unrestrictedbodyminds' },
      { label: '通感的艺术', href: '/unrestrictedbodyminds' },
    ],
  },
  {
    label: '隐藏人物 I',
    href: '/#hidden-figures',
    children: [
      { label: '控制论之父诺伯特·维纳的“听力手套”', href: '/hiddenfigures' },
      { label: '机器人设计“恐怖谷”理论的假肢借喻', href: '/hiddenfigures' },
      { label: '阿兰·图灵“智能”理论中的残障类比', href: '/hiddenfigures' },
      { label: '集成电路的首个商业应用场景：助听器', href: '/hiddenfigures' },
      { label: '自闭症与情感计算', href: '/hiddenfigures' },
    ],
  },
  {
    label: '隐藏人物 II',
    href: '/#hidden-figures',
    children: [
      { label: '郑璇：离开社群和手语语言学参与的科技是无效的', href: '/hiddenfigures2' },
      { label: '邹飞：谷歌职场内外的残障融合', href: '/hiddenfigures2' },
      { label: '吴少玫：口吃社群能创造属于自己的科技未来', href: '/hiddenfigures2' },
      { label: '李麟青：数字化的障碍人士出行指南', href: '/hiddenfigures2' },
      { label: '迟浩宇：视', href: '/hiddenfigures2' },
    ],
  },
  { label: '开源未来', href: '/#open-futures', children: [{ label: '进入专题页', href: '/openfutures' }] },
  { label: '策展团队', href: '/teams' },
]

export const heroContent: HeroContent = {
  eyebrow: '多元宇宙:',
  title: '残障、科技与共建未来',
  supportText: 'with the support of',
  leftImage:
    'https://static.wixstatic.com/media/ad9044_789cc1259c904d3bbb337e43aad60ae2~mv2.png/v1/fill/w_1630,h_1590,al_c,q_95,usm_0.66_1.00_0.01,enc_avif,quality_auto/%E4%B8%BB%E8%A7%86%E8%A7%89-05.png',
  heroImage:
    'https://static.wixstatic.com/media/ad9044_4f43bc78251c4bc4a914458d1b9ad320~mv2.png/v1/fill/w_1572,h_1528,al_c,q_95,usm_0.66_1.00_0.01,enc_avif,quality_auto/%E4%B8%BB%E8%A7%86%E8%A7%89-06.png',
  centerAccentImage:
    'https://static.wixstatic.com/media/ad9044_5ebb93865bc84167bcca88418eb2c66e~mv2.png/v1/fill/w_470,h_472,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_5ebb93865bc84167bcca88418eb2c66e~mv2.png',
  logoImage:
    'https://static.wixstatic.com/media/ad9044_f7c619d9e96242efb67f96f77ae0b231~mv2.png/v1/fill/w_872,h_130,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/%E4%B8%BB%E8%A7%86%E8%A7%89-09.png',
}

export const homepageSections: ThemeSection[] = [
  {
    id: 'unrestricted-bodyminds',
    title: '无限身心',
    lead:
      '“既然一切有用的技术都是辅助性的，很奇怪我们会把有些设备认定为辅助技术而其他技术则不需要描述。”',
    body: [
      'Katherine Ott，史密森尼国家美国历史博物馆科学与医学部策展人。《Artificial parts, practical lives: modern histories of prosthetics》提出，所谓“辅助技术”与其他技术之间，并不存在天然边界。',
      'Ashley Shew 进一步指出，技术能力主义一边声称要用技术赋能残障者，一边又持续强化“什么样的身心才是好的、谁才是有价值的”这一套标准。',
      '与残障有关的技术通常被理解为特殊、医学化、甚至难以启齿的“辅具”。但辅具也可以是日常的、普适的和愉悦的。我们更关心的是：哪些工具真正尊重人的身心差异，哪些技术仍执着于把残障者扭转为所谓的“健全人”。',
      '当技术不再要求人以千篇一律的方式适应工具，而是让工具适应千姿百态的人时，我们才能通往不受限的身心。',
    ],
    cta: [{ label: '点击进入“无限身心”', href: '/unrestrictedbodyminds' }],
  },
  {
    id: 'hidden-figures',
    title: '隐藏人物',
    lead: '辅助托词：初期以残障者为应用场景的技术被当做灵感或测试用例，成为主流技术开发的前身。',
    body: [
      '技术“辅助”残障者，这是我们熟悉的故事脉络。那么残障者是否也“辅助”了技术呢？科技史上，以残障为灵感或隐喻的科学技术屡见不鲜。',
      '残障者时而扮演着新技术乐此不疲的应用场景，时而是催生新理论的科研沃土。如今，越来越多的残障者不再是抽象的比喻，而是作为具体的个人专家参与技术生产，在细微之处改变着技术的可能性。',
      '任何技术的开发都不是一个人能完成的，它们背后有着众多隐藏人物。',
    ],
    cta: [
      { label: '点击进入“隐藏人物Ⅰ”', href: '/hiddenfigures' },
      { label: '点击进入“隐藏人物Ⅱ”', href: '/hiddenfigures2' },
    ],
  },
  {
    id: 'open-futures',
    title: '开源未来',
    lead: '残障社群、残障空间和残障意识的表达，是人机交互实践走向更公平、更正义和更人性化的关键过程。',
    body: [
      'Liz Jackson 对“残障插件”的批评提醒我们：一个出发点很好且设计精美的方案，可能解决的却是残障者根本没觉得有的问题。',
      '“没有我们的参与，不要做与我们有关的决定。” 这不是姿态，而是技术协作的基本原则。',
      'Crip Technoscience 的实践主张把残障者视为日常生活的专家和设计师，而不是等待被治疗、修复和消除的对象。John Lee Clark 也反问：为什么总是别人决定什么算无障碍，而不是由我们来决定什么东西感觉更美？',
      '未来的关键问题不是再制造更多“替他人着想”的技术，而是建立什么样的合作系统，让残障者真正成为技术的主体，而不是客体或课题。',
    ],
    cta: [{ label: '点击进入“开源未来”', href: '/openfutures' }],
  },
]

export const footerContent: FooterContent = {
  title: '清华大学科学博物馆（筹）',
  items: ['展厅地址：清华大学人文楼B2层', '开放时间：周三至周日 9:30-16:00', '团体预约：010-62799883 010-62780628'],
}

export const placeholderPages: Record<
  string,
  {
    title: string
    description: string
  }
> = {
  unrestrictedbodyminds: {
    title: '无限身心',
    description: '该专题页的首页入口已经接通。正文页将在补全原始页面资源后继续高保真还原。',
  },
  hiddenfigures: {
    title: '隐藏人物 I',
    description: '当前仓库仅有首页配置与截图参考，这个子页面先保留占位，等待补充对应 HTML / JSON 资源后继续实现。',
  },
  hiddenfigures2: {
    title: '隐藏人物 II',
    description: '该专题的导航已接通，页面主体暂以占位形式保留，后续可按补充资源继续拆解重建。',
  },
  openfutures: {
    title: '开源未来',
    description: '首页区块已经完成，专题正文页会在获得对应原始页面配置后继续实现。',
  },
  teams: {
    title: '策展团队',
    description: '团队页入口已接通，后续可在补全原站资源后继续还原。',
  },
}

export type TeamsPerson = {
  name: string
  bio: string
}

export type TeamsGroup = {
  title: string
  entries: TeamsPerson[]
}

export type TeamsOrganization = {
  name: string
  englishName?: string
  href: string
  logo: string
}

export const teamsPageContent = {
  title: '策展团队',
  teamTitle: '策展团队',
  advisorTitle: '学术顾问',
  organizationsTitle: '鸣谢机构',
  teamMembers: [
    {
      name: '吴迪',
      bio: '麻省理工学院(MIT)科学技术与社会项目博士候选人，联合国残障人权利伙伴关系中国项目顾问。曾任联合国开发计划署(UNDP)残障项目主管，融易咨询（残障融合社会企业）联合创始人。其博士研究关注残障、劳动与技术的互动。',
    },
    {
      name: '王舒畅',
      bio: '清华大学科学史系硕士研究生，本科毕业于中山大学社会学。曾任北京市通州区乐益融社会工作事务所（残障姐妹BEST）实习生。研究方向为残障、科技以及社会性别的交叉。',
    },
    {
      name: '陈雪扬',
      bio: '清华大学科学史系博士后，北京大学理学博士。研究方向为医学哲学与医学思想史，关注身体叙事与医学批评。',
    },
    {
      name: '林子皓',
      bio: '芝加哥大学比较人类发展学系博士在读，《智能社会研究》青年编委，人类学中文平台“结绳志”编辑，曾发文于《新闻与传播研究》、Disability & Society、澎湃思想市场、信睿周报等刊物媒体。关注聋人文化、无障碍城市建设等议题。',
    },
    {
      name: '万婧伊',
      bio: '北京师范大学附属实验中学高三学生，意向专业方向为艺术和人权，曾在多个当代艺术中心为残障人士提供讲解和志愿服务，为听障群体撰写校对电影描述词。',
    },
    {
      name: '王景',
      bio: '清华大学科学博物馆馆员。北京大学法学院与瑞典隆德大学罗尔·瓦伦堡人权与人道法研究所人权硕士、荷兰莱顿大学东亚研究硕士。热爱公益事业，有17年海内外社会工作与志愿服务经历。',
    },
    {
      name: '蔡聪',
      bio: '视力障碍，上海有人公益基金会理事，一加一残障公益集团合伙人，中国社会科学院大学传播系博士在读。致力于大众残障融合意识的提升，关注方向为残障文化研究、数字包容与平等，传播与社会发展。',
    },
    {
      name: '郑璇',
      bio: '北京师范大学教育学部教授、博士生导师，国家手语和盲文研究中心成员。2009年获得博士学位，成为中国首位聋人语言学博士。兼通汉语、英语、中国手语和美国手语。研究兴趣为聋教育、手语语言学、残障人群心理咨询。',
    },
    {
      name: '王超',
      bio: '芝加哥大学历史学博士，香港中文大学（深圳）讲师，研究方向为中国视障群体社会权利发展与福利国家针对残障群体社会保障的互动。2022年5月与清华大学无障碍发展研究院共同举办首届全球无障碍日清华论坛，推进“科技赋能无障碍”观念面向中国高校大学生与残障群体的接受。',
    },
    {
      name: '焦阳',
      bio: '清华大学未来实验室助理研究员，主持“盲人用计算机”等科研项目。主要研究领域为人机交互设计、触觉认知与交互设计与VR视听语言及体验设计。',
    },
  ] satisfies TeamsPerson[],
  advisoryGroups: [
    {
      title: '展览设计',
      entries: [{ name: '杨伊', bio: '拾梦海设计' }],
    },
    {
      title: '无障碍顾问',
      entries: [
        {
          name: '赵超',
          bio: '视力障碍，一加一职得信息无障碍专家，视障开发者，从事信息无障碍多年。目前在持续为国内大厂做无障碍咨询相关工作。',
        },
      ],
    },
    {
      title: '总策划',
      entries: [
        { name: '约翰·罗伯特·杜兰特', bio: '麻省理工学院博物馆馆长' },
        { name: '吴国盛', bio: '清华大学科学博物馆馆长、清华大学科学史系教授、系主任' },
      ],
    },
    {
      title: '总顾问',
      entries: [
        { name: '马建强', bio: '南京特殊教育师范学院教授，中国特殊教育博物馆馆长' },
        { name: '刘年凯', bio: '清华大学科学史系助理教授、清华大学科学博物馆馆长助理、收藏部负责人' },
        { name: '范爱红', bio: '清华大学科学博物馆馆长助理、事业发展部负责人' },
      ],
    },
    {
      title: '展览支持',
      entries: [
        { name: '安·纽曼', bio: '麻省理工学院博物馆展览与展览馆主任' },
        { name: '艾瑞尔·温伯格', bio: '麻省理工学院博物馆数字档案馆长和收藏信息系统经理' },
        { name: '林赛·巴索洛密', bio: '麻省理工学院博物馆展品内容与体验开发经理' },
        { name: '陈卓雅', bio: '中国特殊教育博物馆助理馆员' },
        { name: '郭永', bio: '中国特殊教育博物馆馆员' },
        { name: '季瑾', bio: '中国特殊教育博物馆副研究员' },
        { name: '郑培新', bio: '中国特殊教育博物馆助理馆员' },
        { name: '刘佳妮', bio: '清华大学科学博物馆库房主管' },
        { name: '孙德利', bio: '清华大学科学博物馆网络总监' },
        { name: '尹菱', bio: '清华大学科学博物馆媒体总监' },
        { name: '杨啸', bio: '清华大学科学博物馆研究助理' },
      ],
    },
  ] satisfies TeamsGroup[],
  organizations: [
    {
      name: '北京大学学生爱心社手语分社',
      englishName: "Peking University Student's Loving Heart Sign Language Society",
      href: 'https://mp.weixin.qq.com/s/t2M7ViXLKcAAfZaKsaZ8IQ',
      logo: 'https://static.wixstatic.com/media/ad9044_f146cba235914f8bbf94416f88b8107e~mv2.png/v1/fill/w_138,h_167,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_f146cba235914f8bbf94416f88b8107e~mv2.png',
    },
    {
      name: '清华大学手语社',
      englishName: 'Sign Language Association of Tsinghua University',
      href: 'https://mp.weixin.qq.com/s/WYuSAPQlyVtJQaOrB8j-Fw',
      logo: 'https://static.wixstatic.com/media/ad9044_6d2e54df4e81400caaace1b63aab3008~mv2.jpg/v1/fill/w_180,h_174,al_c,lg_1,q_80,enc_avif,quality_auto/ad9044_6d2e54df4e81400caaace1b63aab3008~mv2.jpg',
    },
    {
      name: '南京特殊教育师范学院',
      englishName: 'Nanjing Normal University of Special Education',
      href: 'https://www.njts.edu.cn/',
      logo: 'https://static.wixstatic.com/media/ad9044_27a4c67618994eb487e5a03baa1f3395~mv2.png/v1/fill/w_151,h_167,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_27a4c67618994eb487e5a03baa1f3395~mv2.png',
    },
    {
      name: '清华大学学生无障碍发展研究协会',
      englishName: 'Tsinghua University Student Association of Accessibility Studies',
      href: 'https://mp.weixin.qq.com/s/kFA6BxcrZa71EvSQeJAIAQ',
      logo: 'https://static.wixstatic.com/media/ad9044_ef73fa8a991d4be78bbacdf889d98962~mv2.png/v1/fill/w_135,h_174,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_ef73fa8a991d4be78bbacdf889d98962~mv2.png',
    },
    {
      name: '中国特殊教育博物馆',
      englishName: 'China Special Education Museum',
      href: 'https://museum.njts.edu.cn/',
      logo: 'https://static.wixstatic.com/media/ad9044_da9a41da94a74f58a83526a1474c5bee~mv2.png/v1/crop/x_123,y_0,w_6657,h_4926/fill/w_216,h_160,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_da9a41da94a74f58a83526a1474c5bee~mv2.png',
    },
    {
      name: '清华大学未来实验室',
      englishName: 'The Future Laboratory, Tsinghua University',
      href: 'https://thfl.tsinghua.edu.cn/index.htm',
      logo: 'https://static.wixstatic.com/media/ad9044_0763845255774cce9c2bee4b88ea0508~mv2.png/v1/crop/x_372,y_234,w_2997,h_1851/fill/w_282,h_174,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_0763845255774cce9c2bee4b88ea0508~mv2.png',
    },
  ] satisfies TeamsOrganization[],
}

export type OpenFuturesVideoEntry = {
  title: string
  note?: string
  summary: string[]
  poster: string
  video: string
}

export type OpenFuturesResource = {
  title: string
  subtitle?: string
  href: string
  image: string
  imageAlt: string
}

export const openFuturesPageContent = {
  title: '开源未来',
  intro:
    '残障经验是科技领域不可或缺的专业知识，我们希望通过社群参与者提供的多媒体展项，呈现残障社群的多样声音，促进社群与技术的对话。',
  videos: [
    {
      title: '热牛奶杯垫',
      note: '鼠标移至视频位置自动播放',
      summary: ['韩婧莹，脑性麻痹人士，致力于残障权利意识倡导五年，热爱探索生命的更多可能。', '录制地点：广州'],
      poster:
        'https://static.wixstatic.com/media/ad9044_88b4058aec17443983bbf1c5779f7511f000.jpg/v1/fill/w_499,h_306,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_88b4058aec17443983bbf1c5779f7511f000.jpg',
      video: 'https://video.wixstatic.com/video/ad9044_88b4058aec17443983bbf1c5779f7511/360p/mp4/file.mp4',
    },
    {
      title: '听障群体对信息获取的多元需求',
      note: '鼠标移至视频位置自动播放',
      summary: [
        '小元，一名后天听力障碍人士，也能熟练使用手语沟通，助听器让我保留了“听”的感受，也了解“聋”的生活。在两个环境中的跳进跳出，让我有了独特的观察、体验视角。',
        '录制时间：2023-02-08',
        '录制地点：北京',
      ],
      poster:
        'https://static.wixstatic.com/media/ad9044_951fe483a3af4f539333b342cfc9abb3f002.jpg/v1/fill/w_216,h_478,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_951fe483a3af4f539333b342cfc9abb3f002.jpg',
      video: 'https://video.wixstatic.com/video/ad9044_951fe483a3af4f539333b342cfc9abb3/360p/mp4/file.mp4',
    },
    {
      title: '点读笔',
      note: '鼠标移至视频位置自动播放',
      summary: [
        '肖佳，视力障碍人士，中国首位盲人美妆师；六段瑜伽教练；自由潜水员；非视觉美学创始人；受残障影响女性中国网络CNWAD前任协调人；中国盲文图书馆阅读越美丽课程讲师；金盲杖视障人职场软实力形象项目课程开发顾问；一加一残障女性项目培训师；联合国开发计划署创业典范女性人物，持续推动残障女性的身体解放、自我接纳与经济赋能。',
        '录制地点：北京家中',
      ],
      poster:
        'https://static.wixstatic.com/media/ad9044_65e7698f6a8d42398435ff08a1fb2f03f002.jpg/v1/fill/w_341,h_565,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_65e7698f6a8d42398435ff08a1fb2f03f002.jpg',
      video: 'https://video.wixstatic.com/video/ad9044_65e7698f6a8d42398435ff08a1fb2f03/480p/mp4/file.mp4',
    },
    {
      title: '智能盲杖“智”在哪里？',
      note: '鼠标移至视频位置自动播放',
      summary: ['周彤，90后视障北漂打工人，偶尔爱美的不精致少女，数码科技尝鲜派。', '录制时间：2020年', '录制地点：北京市大兴区'],
      poster:
        'https://static.wixstatic.com/media/ad9044_0d6ab5fc42784c03b251245e9c88af88f000.jpg/v1/fill/w_272,h_478,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_0d6ab5fc42784c03b251245e9c88af88f000.jpg',
      video: 'https://video.wixstatic.com/video/ad9044_0d6ab5fc42784c03b251245e9c88af88/360p/mp4/file.mp4',
    },
  ] satisfies OpenFuturesVideoEntry[],
  resources: [
    {
      title: '点击跳转到',
      subtitle: '“不碍事儿- 残障融合实验室出品播客”',
      href: 'https://www.xiaoyuzhoufm.com/episode/63f5b24d0d7e8eaa72310937',
      image:
        'https://static.wixstatic.com/media/ad9044_2049c98d48814074b7f24cc6e9a5b455~mv2.jpg/v1/crop/x_67,y_53,w_835,h_1245/fill/w_279,h_417,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/%E4%B8%8D%E7%A2%8D%E4%BA%8B%E5%84%BF.jpg',
      imageAlt: '点击跳转到“不碍事儿- 残障融合实验室出品播客”',
    },
    {
      title: '点击跳转到',
      subtitle: '“一份残障组织与媒体清单”',
      href: 'https://mp.weixin.qq.com/s/enKkUcc6ELd44kMFbKszxw',
      image:
        'https://static.wixstatic.com/media/ad9044_5b903cc6f02b4470947da860b874ca2d~mv2.jpg/v1/fill/w_486,h_380,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/%E7%BB%93%E7%BB%B3%E5%BF%97.jpg',
      imageAlt: '结绳志logo',
    },
  ] satisfies OpenFuturesResource[],
  articleVideo: {
    title: '了解残障融合的障碍',
    video: 'https://video.wixstatic.com/video/ad9044_8146923cb8474e32ae5b5e0465030032/1080p/mp4/file.mp4',
    poster:
      'https://static.wixstatic.com/media/ad9044_8146923cb8474e32ae5b5e0465030032f000.jpg/v1/fill/w_536,h_313,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/ad9044_8146923cb8474e32ae5b5e0465030032f000.jpg',
  },
  participation: {
    body: [
      '一直以来，残障与科技的话题常常被行业专家所主导。一方面，许多看似为残障者发明或以服务残障者作为宣传的技术，可能未必理解残障者真实的需求；另一方面，很多残障人也参与了技术生产，他们从事着与高科技有关的职业，从不同的角度对这个话题有发言权。',
      '我们呼吁残障社群的朋友们持续发声，介绍残障者使用和参与技术的经验，消除公众对于残障的误解。',
    ],
    topics: [
      '你生活中常用的数字工具',
      '对看似高科技实则鸡肋的概念或设计的吐槽',
      '看似低技术含量、实则很好用的生活“神器”',
      '你希望生活中有的智能产品，但还没被开发出来的',
      '你参与技术研发的经历',
      '其他相关主题，欢迎参与者打开脑洞！',
    ],
  },
}

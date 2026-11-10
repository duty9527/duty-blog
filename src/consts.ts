export const SITE_TITLE = '写写代码';
export const SITE_PROMPT = '~/写写代码';
export const SITE_TAGLINE = 'a gopher · 日常生活随录';
export const SITE_DESCRIPTION =
  '日常生活随录 feedId:60978413862965248+userId:41774543735911424';
export const AUTHOR_NAME = '独语天涯';
export const AUTHOR_DESC = 'a gopher';
export const AUTHOR_LOGO = '/img/avatar.webp';
export const SITE_LOGO =
  '/static/img/10801c252eefdfaa2db272c1a688d6af.logo__1_-removebg-preview.png';
export const BASE_URL = 'https://blog.du7y.com';
export const GITHUB_URL = 'https://github.com/duty9527';
export const OLD_GITHUB_URL = 'https://github.com/blue-duty';
export const AUTHOR_EMAIL = 'lwduty666@gmail.com';
export const BEIAN_NUMBER = '陕ICP备2021013504号';
export const BEIAN_URL = 'https://beian.miit.gov.cn/';
export const SINCE_DATE = '2022-10-06T10:52:29.780Z';

export const PAY_ALIPAY =
  '/img/623481edc79835eae4dcf2b387bd1610.photo_6194953870636069952_y.jpg';
export const PAY_WECHAT =
  '/img/c627b099983d5fb57a272d9b840397e0.photo_6194953870636069953_y.jpg';

export const CATEGORIES = ['随笔', 'Linux', 'Go', 'db', 'Rust', '转载'] as const;

export const VANBLOG_STATS = {
  viewer: 7475,
  visited: 5251,
  totalWordCount: 60106,
  aboutUpdatedAt: 1731307871003,
};

export const ABOUT_PARAGRAPHS = [
  '这里是小伟的随笔，一个用来学习和记录生活的地方，在这里，你可能看到他的生活琐事，也可能看到一些可有可无的knowledge，当然，主要还是用来记录生活，毕竟，Life Is Knowledge。',
  '本人曾读于西安某大学，软件工程专业，一年半的时间学习过C/C++，后又自学了基础Python，主要为了掌握基本的爬虫技能，后在阴差阳错下选择了Golang语言，并为之努力奋斗到至今。',
  'My values：“Be Patient With Yourself. You\'re Working On It.”',
];

// Format Date in Asia/Shanghai (UTC+8) to match original VanBlog timestamps
export function formatDateCN(d: Date): string {
  const cnTime = new Date(d.getTime() + 8 * 3600 * 1000);
  return cnTime.toISOString().slice(0, 10);
}

export function formatMonthDayCN(d: Date): string {
  const cnTime = new Date(d.getTime() + 8 * 3600 * 1000);
  return cnTime.toISOString().slice(5, 10);
}

export function getYearCN(d: Date): number {
  const cnTime = new Date(d.getTime() + 8 * 3600 * 1000);
  return cnTime.getUTCFullYear();
}

// Google Search Console 与 Bing Webmaster 站点验证配置
// 可直接在此填入验证码，或在 Cloudflare Pages 环境变量中配置 PUBLIC_GOOGLE_SITE_VERIFICATION / PUBLIC_BING_SITE_VERIFICATION
export const SEO_CONFIG = {
  googleSiteVerification:
    import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION || '', // 对应 <meta name="google-site-verification" content="..." />
  bingSiteVerification:
    import.meta.env.PUBLIC_BING_SITE_VERIFICATION || '', // 对应 <meta name="msvalidate.01" content="..." />
  baiduSiteVerification:
    import.meta.env.PUBLIC_BAIDU_SITE_VERIFICATION || '', // 对应 <meta name="baidu-site-verification" content="..." />
};

// Giscus 评论配置（前往 https://giscus.app 获取你的 repoId 和 categoryId 后填入即可启用）
export const GISCUS_CONFIG = {
  enabled: true,
  repo: 'duty9527/duty-blog',
  repoId: '', // 填入你的 data-repo-id（留空时展示配置指引卡片）
  category: 'Announcements',
  categoryId: '', // 填入你的 data-category-id
  mapping: 'pathname',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'top',
  lang: 'zh-CN',
};



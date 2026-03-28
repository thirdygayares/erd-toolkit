
module.exports = {
    siteUrl: "https://erd-toolkit.thirdygayares.com",
    generateRobotsTxt: true,
    changefreq: 'monthly',
    priority: 0.5,
    sitemapSize: 7000,
    additionalPaths: async () => {
        const now = new Date().toISOString();
        return [
            {
                loc: "/",
                changefreq: "daily",
                priority: 1.0,
                lastmod: now,
            }
        ]
    }
};
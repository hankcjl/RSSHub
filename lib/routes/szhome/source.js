const got = require('@/utils/got');
const cheerio = require('cheerio');
const date_util = require('@/utils/date');

module.exports = async (ctx) => {
    const type = ctx.params.type || 'source';
    const id = ctx.params.id;
    const link = `http://m.szhome.com/30.html?menuid=1`;

    const response = await got.get(link);
    const $ = cheerio.load(response.data);
    const title = $('.flex1').text();

    const list = $('div.communLlist')
        .slice(0, 10)
        .map(function() {
            const info = {
                title: $(this)
                    .find('.listItemCont')
                    .text(),
                link: $(this)
                    .find('.listItem > a')
                    .attr('href'),
            };
            return info;
        })
        .get();

    const out = await Promise.all(
        list.map(async (info) => {
            const title = info.title;
            const itemUrl = 'http://m.szhome.com' + info.link;

            const cache = await ctx.cache.get(itemUrl);
            if (cache) {
                return Promise.resolve(JSON.parse(cache));
            }

            const response = await got({
                url: itemUrl,
                method: 'get',
                headers: {
                    Referer: link,
                },
            });

            const $ = cheerio.load(response.data);

            const description = $('div.article_content div').html() || '原文已被删除';

            const date = $('span.time').text();

            const single = {
                title: title,
                link: itemUrl,
                description: description,
                pubDate: date_util(date, 8),
            };
            ctx.cache.set(itemUrl, JSON.stringify(single));
            return Promise.resolve(single);
        })
    );

    ctx.state.data = {
        title: `业主论坛-家在深圳`,
        link: link,
        item: out,
    };
};

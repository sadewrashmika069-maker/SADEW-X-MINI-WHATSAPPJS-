try {
                await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

                const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
                
                // 🔥 Cloudflare එක රවට්ටන්න AllOrigins කියන Free Proxy එක පාවිච්චි කරමු!
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
                
                // Proxy එක හරහා Request එක යවනවා
                const response = await axios.get(proxyUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                // AllOrigins එකෙන් අපිට HTML එක දෙන්නේ 'contents' කියන කොටස ඇතුළේ
                const htmlCode = response.data.contents; 

                if (!htmlCode) throw new Error("Proxy එකෙන් HTML ලබාගැනීමට නොහැකි විය.");

                const $ = cheerio.load(htmlCode);
                const results = [];

                // අර කලින් විදිහටම Class ටික හොයනවා
                $('.item, .video').each((i, el) => {
                    if (i >= 5) return; 
                    
                    const title = $(el).find('.item-content b a, .video-content b a').text().trim();
                    const link = $(el).find('.item-content b a, .video-content b a').attr('href');
                    let image = $(el).find('.item-header img, .video-header img').attr('src');

                    if (image && image.includes('video-thumb.png')) {
                        const styleStr = $(el).find('.item-header img, .video-header img').attr('style');
                        if (styleStr) {
                            const match = styleStr.match(/url\(['"]?(.*?)['"]?\)/);
                            if (match) image = match[1];
                        }
                    }

                    if (title && link) {
                        results.push({ title, link, image });
                    }
                });

                // ... (මෙතනින් පස්සේ කෝඩ් එකේ ඉතුරු ටික කලින් විදිහටමයි තියෙන්නේ. ඒ ටික වෙනස් කරන්න ඕනේ නෑ) ...

const axios = require("axios");
const crypto = require("crypto");

if (!global.mbStore) global.mbStore = {};

module.exports = {
    name: "moviebox",
    category: 1,
    description: "Search MovieBox movies",
    commands: ["moviepro", "moviebox", "mbmovie", "mbdl"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {

        const apikey = "frontoffice9876@gmail.com:vajira-88173";


        // ===========================
        // SEARCH MOVIE
        // ===========================
        if (command === "moviepro" || command === "moviebox") {

            const query = args.join(" ").trim();

            if (!query)
                return reply(
                    "🎬 *Movie name එකක් දෙන්න*\n\nExample:\n.moviepro Avatar"
                );


            try {

                await socket.sendMessage(sender,{
                    react:{
                        text:"🔍",
                        key:msg.key
                    }
                });


                const url =
                `https://vajiraofc-apis.vercel.app/api/movieboxs?apikey=${apikey}&query=${encodeURIComponent(query)}&page=1&perPage=5`;


                const res = await axios.get(url,{
                    timeout:15000
                });


                const items = res.data?.data?.items || [];


                if(!items.length)
                    return reply("❌ Movie එක හමු වුනේ නැහැ");


                let text =
`*🔍 SADEW-MINI MOVIEBOX*

`;


                let buttons=[];


                items.forEach((m,i)=>{

                    let type =
                    m.subjectType == 2
                    ? "📺 Series"
                    : "🎬 Movie";


                    let year =
                    m.releaseDate
                    ? m.releaseDate.split("-")[0]
                    :"N/A";


                    text +=
`*${i+1}.* ${m.title} (${year})
⭐ ${m.imdbRatingValue || "N/A"}

`;


                    buttons.push({

                        buttonId:
                        `.mbmovie ${m.subjectType}|${m.subjectId}|${m.detailPath}`,

                        buttonText:{
                            displayText:`${type} ${i+1}`
                        },

                        type:1
                    });

                });


                await socket.sendMessage(sender,{

                    image:{
                        url:items[0]?.cover?.url
                    },

                    caption:text,

                    footer:"👑 SADEW-MINI 👑",

                    buttons:buttons,

                    headerType:4

                },{quoted:msg});


            }catch(e){

                console.log("Search Error:",e.message);

                reply("❌ Search error");
            }

        }



        // ===========================
        // QUALITY SELECT
        // ===========================
        else if(command==="mbmovie"){


            const data=args.join(" ").split("|");

            if(data.length!==3) return;


            const subjectType=data[0];
            const subjectId=data[1];
            const detailPath=data[2];


            let season =
            subjectType==="2" ? 1:0;

            let episode =
            subjectType==="2" ? 1:0;



            try{


                const url =
                `https://vajiraofc-apis.vercel.app/api/movieboxdl?apikey=${apikey}&subjectId=${subjectId}&detailPath=${detailPath}&season=${season}&episode=${episode}`;



                const res=await axios.get(url);


                const downloads =
                res.data?.data?.downloads?.data?.downloads || [];



                if(!downloads.length)
                    return reply("❌ Download links නැහැ");



                const title =
                res.data?.data?.details?.subject?.title || "Movie";


                let txt =
`*🎬 SADEW-MINI QUALITY*

${title}


`;

                let buttons=[];



                downloads.slice(0,10).forEach((dl)=>{


                    const quality =
                    dl.quality ||
                    `${dl.resolution}p` ||
                    "HD";


                    const size =
                    dl.size
                    ? (parseInt(dl.size)/1024/1024).toFixed(1)+" MB"
                    :"Unknown";



                    const id =
                    crypto.randomBytes(4).toString("hex");



                    global.mbStore[id]={

                        // IMPORTANT FIX
                        url:
                        dl.directUrl ||
                        dl.url ||
                        dl.downloadUrl,


                        title:title,

                        quality:quality,

                        size:size

                    };



                    setTimeout(()=>{

                        delete global.mbStore[id];

                    },1800000);



                    txt +=
`🎥 ${quality} - ${size}
`;



                    buttons.push({

                        buttonId:
                        `.mbdl ${id}`,

                        buttonText:{
                            displayText:
                            `Download ${quality}`
                        },

                        type:1

                    });


                });



                await socket.sendMessage(sender,{

                    text:txt,

                    footer:"👑 SADEW-MINI",

                    buttons:buttons,

                    headerType:1

                },{quoted:msg});



            }catch(e){

                console.log("Quality Error:",e.message);

                reply("❌ Quality error");

            }

        }




        // ===========================
        // FINAL DOWNLOAD LINK
        // ===========================
        else if(command==="mbdl"){


            const id=args[0];


            const movie=global.mbStore[id];


            if(!movie)
                return reply(
                    "❌ Link expired. නැවත search කරන්න"
                );



            try{


                const finalLink =

                `https://vajiraofc-apis.vercel.app/?url=${encodeURIComponent(movie.url)}&name=${encodeURIComponent(movie.title)}&quality=${movie.quality}&direct=true`;



                let msgText =
`*🎬 SADEW-MINI MOVIEBOX*

🎥 Title:
${movie.title}

✨ Quality:
${movie.quality}

📦 Size:
${movie.size}


👇 Download Link:

${finalLink}


> Sadew-Mini By Sadew Rashmika`;


                await socket.sendMessage(sender,{

                    text:msgText

                },{quoted:msg});



                delete global.mbStore[id];



            }catch(e){

                console.log("Link Error:",e.message);

                reply("❌ Link error");

            }

        }

    }
};

-- Salimos · vídeos de TikTok de los locales que lo tienen (04/11/2026). Solo los que hablan de ese sitio; los rankings de varios locales no entran.
update salimos.locales set video = 'https://www.tiktok.com/@localguidegrancanaria/video/7345573122638220576', video_autor = 'localguidegrancanaria' where nombre = 'Emblemática Rooftop';
update salimos.locales set video = 'https://www.tiktok.com/@ashuncion/video/7306101571291532576', video_autor = 'ashuncion' where nombre = 'Terraza Belvedere';
update salimos.locales set video = 'https://www.tiktok.com/@taniapyetku/video/7398275693047516421', video_autor = 'taniapyetku' where nombre = 'Guachinche Motor Grande';
update salimos.locales set video = 'https://www.tiktok.com/@localguidegrancanaria/video/7405961108973997345', video_autor = 'localguidegrancanaria' where nombre = 'Bochinche Bar Suso';
update salimos.locales set video = 'https://www.tiktok.com/@thenesorfrancisco/video/7434586204840004886', video_autor = 'thenesorfrancisco' where nombre = 'El Senador';
update salimos.locales set video = 'https://www.tiktok.com/@lauracampayo/video/7296100795508935968', video_autor = 'lauracampayo' where nombre = 'Nakar';
update salimos.locales set video = 'https://www.tiktok.com/@localguidegrancanaria/video/7278368198876089632', video_autor = 'localguidegrancanaria' where nombre = 'Deliciosa Marta';
update salimos.locales set video = 'https://www.tiktok.com/@quecomerengrancanaria/video/7207725582430293253', video_autor = 'quecomerengrancanaria' where nombre = 'La Pizarra: Sabores del Mar';
update salimos.locales set video = 'https://www.tiktok.com/@localguidegrancanaria/video/7376746333308276000', video_autor = 'localguidegrancanaria' where nombre = 'Rêver Restaurante';
update salimos.locales set video = 'https://www.tiktok.com/@chester_club/video/7219622432468978949', video_autor = 'chester_club' where nombre = 'Chester Meloneras Club & Lounge';
update salimos.locales set video = 'https://www.tiktok.com/@thenesorfrancisco/video/7438229727204117782', video_autor = 'thenesorfrancisco' where nombre = 'La Vicaría';
update salimos.locales set video = 'https://www.tiktok.com/@a.darkness21/video/7351973933446384929', video_autor = 'a.darkness21' where nombre = 'Ca''tita';
update salimos.locales set video = 'https://www.tiktok.com/@sparkles.gc/video/7509186885248453910', video_autor = 'sparkles.gc' where nombre = 'Sparkles';
select count(*) filter (where video is not null) con_video, count(*) locales from salimos.locales;

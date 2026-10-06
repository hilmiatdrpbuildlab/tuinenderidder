import type { Scene } from '../placeholder-art';
import type { AboutBlocks, ContactBlocks, HomeBlocks, LegalBlocks } from '$lib/content/pages';

/**
 * Demo content. Service names and company details come from the current site
 * (tuinen-deridder.be); project stories and testimonials are placeholders for the client to
 * replace with genuine content through the CMS before launch.
 */

type Tr = { title: string; summary: string; body: string; highlights: string[]; seoTitle: string; seoDesc: string };

export const seedServices: {
	slug: string;
	icon: string;
	sort: number;
	isBookable: boolean;
	baseDurationMin: number;
	priceFrom: number | null;
	priceMode: 'fixed' | 'quote';
	scene: Scene;
	nl: Tr;
	en: Tr;
}[] = [
	{
		slug: 'aanleg',
		icon: 'shovel',
		sort: 1,
		isBookable: true,
		baseDurationMin: 60,
		priceFrom: null,
		priceMode: 'quote',
		scene: 'terrace',
		nl: {
			title: 'Aanleg',
			summary:
				'Van eerste schets tot laatste plant: wij ontwerpen en leggen uw tuin aan, met terrassen, paden, borders en beplanting die bij uw woning past.',
			body: '<p>Een nieuwe tuin begint met een goed gesprek. We komen gratis langs, luisteren naar uw wensen en bekijken de grond, de ligging en het budget. Daarna maken we een ontwerp en een duidelijke offerte.</p><h3>Wat we aanleggen</h3><ul><li>Terrassen en opritten in natuursteen, keramiek of hout</li><li>Borders met vaste planten, heesters en bomen</li><li>Hagen, gazons en natuurlijke vijvers</li><li>Grondwerken, drainage en verlichting</li></ul><p>Eén aanspreekpunt van begin tot eind, en een tuin die klaar is om van te genieten.</p>',
			highlights: ['Gratis adviesgesprek ter plaatse', 'Ontwerp + offerte op maat', 'Terrassen, borders, vijvers'],
			seoTitle: 'Tuinaanleg in Maaseik en omgeving',
			seoDesc: 'Tuinaanleg op maat in Neeroeteren, Maaseik en omgeving: ontwerp, terrassen, beplanting en gazon.'
		},
		en: {
			title: 'Garden design & build',
			summary:
				'From first sketch to the last plant: we design and build your garden, with terraces, paths, borders and planting that suit your home.',
			body: '<p>A new garden starts with a good conversation. We visit for free, listen to your wishes and look at the soil, the layout and your budget. Then we make a design and a clear quote.</p><h3>What we build</h3><ul><li>Terraces and driveways in natural stone, ceramic or wood</li><li>Borders with perennials, shrubs and trees</li><li>Hedges, lawns and natural ponds</li><li>Groundwork, drainage and lighting</li></ul><p>One point of contact from start to finish, and a garden ready to enjoy.</p>',
			highlights: ['Free on-site consultation', 'Tailored design + quote', 'Terraces, borders, ponds'],
			seoTitle: 'Garden design & build around Maaseik',
			seoDesc: 'Bespoke garden design and build in Neeroeteren, Maaseik and the area: design, terraces, planting and lawns.'
		}
	},
	{
		slug: 'onderhoud',
		icon: 'lawnmower',
		sort: 2,
		isBookable: true,
		baseDurationMin: 240,
		priceFrom: 180,
		priceMode: 'fixed',
		scene: 'lawn',
		nl: {
			title: 'Onderhoud',
			summary:
				'Wekelijks, maandelijks of jaarlijks onderhoud: maaien, wieden, snoeien en opruimen, zodat uw tuin het hele jaar verzorgd blijft.',
			body: '<p>Geen tijd of zin om zelf in de tuin te werken? Wij nemen het onderhoud volledig over, op het ritme dat bij u past.</p><h3>Inbegrepen</h3><ul><li>Gras maaien en kanten steken</li><li>Borders wieden en bijwerken</li><li>Hagen en heesters in vorm houden</li><li>Bladruimen en afvoer van groenafval</li></ul><p>U kiest een eenmalige beurt of een vast onderhoudscontract. Een beurt duurt een halve dag (voormiddag of namiddag).</p>',
			highlights: ['Wekelijks, maandelijks of jaarlijks', 'Groenafval wordt afgevoerd', 'Vaste ploeg, vaste afspraken'],
			seoTitle: 'Tuinonderhoud in Maaseik en omgeving',
			seoDesc: 'Wekelijks, maandelijks of jaarlijks tuinonderhoud in Neeroeteren, Maaseik en omgeving. Plan online.'
		},
		en: {
			title: 'Garden maintenance',
			summary:
				'Weekly, monthly or yearly maintenance: mowing, weeding, pruning and tidying, so your garden looks cared for all year round.',
			body: '<p>No time or energy to work in the garden yourself? We take over the maintenance completely, at a rhythm that suits you.</p><h3>Included</h3><ul><li>Mowing and edging the lawn</li><li>Weeding and tidying borders</li><li>Keeping hedges and shrubs in shape</li><li>Leaf clearing and green-waste removal</li></ul><p>Choose a one-off visit or a maintenance contract. A visit takes half a day (morning or afternoon).</p>',
			highlights: ['Weekly, monthly or yearly', 'Green waste removed', 'Same crew, clear agreements'],
			seoTitle: 'Garden maintenance around Maaseik',
			seoDesc: 'Weekly, monthly or yearly garden maintenance in Neeroeteren, Maaseik and the area. Book online.'
		}
	},
	{
		slug: 'snoeiwerken',
		icon: 'shears',
		sort: 3,
		isBookable: true,
		baseDurationMin: 240,
		priceFrom: 150,
		priceMode: 'fixed',
		scene: 'hedge',
		nl: {
			title: 'Snoeiwerken',
			summary:
				'Hagen, heesters, vormbomen en fruitbomen vakkundig gesnoeid, op het juiste moment van het jaar voor een gezonde groei.',
			body: '<p>Goed snoeien is meer dan knippen. We snoeien elke plant op haar eigen moment en op haar eigen manier, zodat ze gezond blijft en mooi in vorm.</p><ul><li>Hagen strak in lijn, ook hoge hagen</li><li>Vormsnoei van buxus, taxus en leibomen</li><li>Snoei van heesters, rozen en klimplanten</li><li>Al het snoeisel wordt opgeruimd en afgevoerd</li></ul>',
			highlights: ['Hagen, heesters en vormbomen', 'Op het juiste moment', 'Snoeisel wordt afgevoerd'],
			seoTitle: 'Snoeiwerken in Maaseik en omgeving',
			seoDesc: 'Hagen en heesters vakkundig gesnoeid in Neeroeteren, Maaseik en omgeving.'
		},
		en: {
			title: 'Pruning',
			summary:
				'Hedges, shrubs, topiary and fruit trees pruned professionally, at the right time of year for healthy growth.',
			body: '<p>Good pruning is more than cutting. We prune every plant at its own time and in its own way, so it stays healthy and in shape.</p><ul><li>Hedges cut straight, including tall hedges</li><li>Topiary for box, yew and pleached trees</li><li>Pruning of shrubs, roses and climbers</li><li>All clippings are cleared and removed</li></ul>',
			highlights: ['Hedges, shrubs and topiary', 'At the right moment', 'Clippings removed'],
			seoTitle: 'Pruning around Maaseik',
			seoDesc: 'Professional hedge and shrub pruning in Neeroeteren, Maaseik and the area.'
		}
	},
	{
		slug: 'bomen-snoeien-vellen',
		icon: 'tree',
		sort: 4,
		isBookable: true,
		baseDurationMin: 60,
		priceFrom: null,
		priceMode: 'quote',
		scene: 'trees',
		nl: {
			title: 'Snoeien & vellen van bomen',
			summary:
				'Veilig snoeien, innemen en vellen van bomen, ook op moeilijk bereikbare plaatsen. Inclusief afvoer of verhakselen.',
			body: '<p>Een boom die te groot wordt, ziek is of gevaar oplevert, vraagt om vakwerk. We bekijken de situatie ter plaatse en geven advies: snoeien, innemen of vellen.</p><ul><li>Kroonsnoei en begeleidingssnoei</li><li>Gecontroleerd vellen, ook in kleine tuinen</li><li>Stronken frezen</li><li>Hout verhakselen of afvoeren</li></ul><p>Voor het vellen van bomen is soms een vergunning nodig. We helpen u op weg.</p>',
			highlights: ['Veilig en verzekerd', 'Stronken frezen', 'Advies over vergunning'],
			seoTitle: 'Bomen snoeien en vellen in Maaseik',
			seoDesc: 'Bomen veilig snoeien, innemen en vellen in Neeroeteren, Maaseik en omgeving. Gratis offerte.'
		},
		en: {
			title: 'Tree pruning & felling',
			summary:
				'Safe pruning, reducing and felling of trees, also in hard-to-reach places. Including removal or chipping.',
			body: '<p>A tree that grows too large, is diseased or has become a hazard needs expert work. We assess the situation on site and advise: prune, reduce or fell.</p><ul><li>Crown pruning and formative pruning</li><li>Controlled felling, even in small gardens</li><li>Stump grinding</li><li>Chipping or removal of wood</li></ul><p>Felling a tree sometimes requires a permit. We help you with that.</p>',
			highlights: ['Safe and insured', 'Stump grinding', 'Permit advice'],
			seoTitle: 'Tree pruning and felling near Maaseik',
			seoDesc: 'Safe tree pruning, reduction and felling in Neeroeteren, Maaseik and the area. Free quote.'
		}
	},
	{
		slug: 'gazon',
		icon: 'grass',
		sort: 5,
		isBookable: true,
		baseDurationMin: 240,
		priceFrom: 95,
		priceMode: 'fixed',
		scene: 'lawn',
		nl: {
			title: 'Onderhoud & aanleg gazon',
			summary:
				'Een dicht, groen gazon: nieuw aangelegd met zaad of graszoden, of opgeknapt met verticuteren, bemesten en bijzaaien.',
			body: '<p>Een mooi gazon vraagt de juiste aanpak op het juiste moment. We leggen nieuwe gazons aan en brengen bestaande gazons weer in topvorm.</p><ul><li>Aanleg met graszoden of gazonzaad</li><li>Verticuteren, beluchten en bijzaaien</li><li>Bemesten en mos bestrijden</li><li>Maaibeurten op vaste tijden</li></ul>',
			highlights: ['Graszoden of zaad', 'Verticuteren en bijzaaien', 'Bemesting op maat'],
			seoTitle: 'Gazon aanleggen en onderhouden in Maaseik',
			seoDesc: 'Nieuw gazon of gazonrenovatie in Neeroeteren, Maaseik en omgeving. Plan online.'
		},
		en: {
			title: 'Lawn care & installation',
			summary:
				'A dense, green lawn: newly laid with seed or turf, or restored with scarifying, feeding and overseeding.',
			body: '<p>A beautiful lawn needs the right approach at the right time. We lay new lawns and bring existing lawns back into top shape.</p><ul><li>New lawns with turf or seed</li><li>Scarifying, aerating and overseeding</li><li>Feeding and moss control</li><li>Mowing on a fixed schedule</li></ul>',
			highlights: ['Turf or seed', 'Scarifying and overseeding', 'Tailored feeding'],
			seoTitle: 'Lawn installation and care near Maaseik',
			seoDesc: 'New lawns or lawn renovation in Neeroeteren, Maaseik and the area. Book online.'
		}
	}
];

export const seedProjects: {
	slug: string;
	service: string;
	town: string;
	year: number;
	featured: boolean;
	scenes: Scene[];
	beforeAfter?: [Scene, Scene];
	portrait: boolean;
	nl: { title: string; summary: string; story: string };
	en: { title: string; summary: string; story: string };
}[] = [
	{
		slug: 'moderne-tuin-met-keramisch-terras',
		service: 'aanleg',
		town: 'Maaseik',
		year: 2025,
		featured: true,
		scenes: ['terrace', 'lawn'],
		beforeAfter: ['build', 'terrace'],
		portrait: true,
		nl: {
			title: 'Moderne tuin met keramisch terras',
			summary: 'Een volledig nieuwe tuin met een ruim terras, strakke borders en een gazon met stapstenen.',
			story: '<p>De eigenaars wilden een tuin die weinig onderhoud vraagt maar toch groen en warm aanvoelt. We legden een terras in keramische tegels aan, met plantvakken in cortenstaal en een gazon met stapstenen naar de achterste zithoek.</p><p>De werken duurden drie weken, inclusief grondwerken en drainage.</p>'
		},
		en: {
			title: 'Modern garden with ceramic terrace',
			summary: 'A completely new garden with a spacious terrace, clean borders and a lawn with stepping stones.',
			story: '<p>The owners wanted a garden that needs little maintenance but still feels green and warm. We laid a terrace in ceramic tiles, with corten steel planters and a lawn with stepping stones to the seating area at the back.</p><p>The work took three weeks, including groundwork and drainage.</p>'
		}
	},
	{
		slug: 'strakke-haagbeplanting-neeroeteren',
		service: 'snoeiwerken',
		town: 'Neeroeteren',
		year: 2025,
		featured: true,
		scenes: ['hedge', 'hedge'],
		portrait: false,
		nl: {
			title: 'Strakke hagen en taxusbollen',
			summary: 'Jaarlijkse vormsnoei van 80 meter haag en een rij taxusbollen.',
			story: '<p>Twee keer per jaar brengen we deze hagen terug in strakke lijn. De taxusbollen krijgen een fijne vormsnoei met de hand.</p>'
		},
		en: {
			title: 'Clean hedges and yew balls',
			summary: 'Yearly shaping of 80 metres of hedge and a row of yew balls.',
			story: '<p>Twice a year we bring these hedges back into a straight line. The yew balls get a fine hand-shaped trim.</p>'
		}
	},
	{
		slug: 'nieuw-gazon-opoeteren',
		service: 'gazon',
		town: 'Opoeteren',
		year: 2024,
		featured: true,
		scenes: ['lawn'],
		beforeAfter: ['overgrown', 'lawn'],
		portrait: true,
		nl: {
			title: 'Van verwilderd naar strak gazon',
			summary: 'Een verwaarloosd grasveld omgevormd tot een dicht gazon met graszoden.',
			story: '<p>Het oude gazon zat vol mos en onkruid. We freesden de bodem, verbeterden ze met teelaarde en legden in één dag nieuwe graszoden.</p>'
		},
		en: {
			title: 'From overgrown to a perfect lawn',
			summary: 'A neglected patch of grass turned into a dense turf lawn.',
			story: '<p>The old lawn was full of moss and weeds. We tilled the soil, improved it with topsoil and laid new turf in a single day.</p>'
		}
	},
	{
		slug: 'vellen-zieke-berk-kinrooi',
		service: 'bomen-snoeien-vellen',
		town: 'Kinrooi',
		year: 2025,
		featured: false,
		scenes: ['trees', 'trees'],
		portrait: false,
		nl: {
			title: 'Gecontroleerd vellen van een zieke berk',
			summary: 'Een berk van 18 meter, vlak bij de woning, in delen geveld.',
			story: '<p>De berk was ziek en hing over het dak. Met klimtechniek namen we de boom in delen weg, zonder schade aan woning of tuin. De stronk werd uitgefreesd.</p>'
		},
		en: {
			title: 'Controlled felling of a diseased birch',
			summary: 'An 18-metre birch next to the house, taken down in sections.',
			story: '<p>The birch was diseased and leaned over the roof. Using climbing techniques we removed the tree in sections, without damage to house or garden. The stump was ground out.</p>'
		}
	},
	{
		slug: 'natuurlijke-vijvertuin-dilsen',
		service: 'aanleg',
		town: 'Dilsen-Stokkem',
		year: 2024,
		featured: true,
		scenes: ['pond', 'lawn'],
		portrait: false,
		nl: {
			title: 'Natuurlijke vijvertuin',
			summary: 'Een kleine vijver met natuurstenen rand als nieuw middelpunt van de tuin.',
			story: '<p>Rond de nieuwe vijver kozen we inheemse beplanting die vlinders en bijen aantrekt. Een grindpad leidt naar een zitplek aan het water.</p>'
		},
		en: {
			title: 'Natural pond garden',
			summary: 'A small pond with a natural stone edge as the new heart of the garden.',
			story: '<p>Around the new pond we chose native planting that attracts butterflies and bees. A gravel path leads to a seat by the water.</p>'
		}
	},
	{
		slug: 'jaarlijks-onderhoud-villatuin-bree',
		service: 'onderhoud',
		town: 'Bree',
		year: 2025,
		featured: false,
		scenes: ['lawn', 'hedge'],
		portrait: true,
		nl: {
			title: 'Onderhoudscontract villatuin',
			summary: 'Maandelijks onderhoud van een tuin van 2.000 m² met gazon, borders en hagen.',
			story: '<p>Elke maand komt dezelfde ploeg langs voor maaien, wieden en snoeien. In het najaar ruimen we het blad en maken we de tuin winterklaar.</p>'
		},
		en: {
			title: 'Villa garden maintenance contract',
			summary: 'Monthly care of a 2,000 m² garden with lawn, borders and hedges.',
			story: '<p>Every month the same crew visits for mowing, weeding and pruning. In autumn we clear the leaves and prepare the garden for winter.</p>'
		}
	},
	{
		slug: 'borders-vaste-planten-as',
		service: 'aanleg',
		town: 'As',
		year: 2024,
		featured: false,
		scenes: ['build', 'lawn'],
		portrait: true,
		nl: {
			title: 'Borders met vaste planten',
			summary: 'Nieuwe borders met grassen en vaste planten die het hele jaar boeien.',
			story: '<p>We kozen een mix van siergrassen, vaste planten en bolgewassen, zodat er van maart tot november iets bloeit.</p>'
		},
		en: {
			title: 'Perennial borders',
			summary: 'New borders with grasses and perennials that stay interesting all year.',
			story: '<p>We chose a mix of ornamental grasses, perennials and bulbs, so something flowers from March to November.</p>'
		}
	},
	{
		slug: 'snoei-fruitbomen-maaseik',
		service: 'bomen-snoeien-vellen',
		town: 'Maaseik',
		year: 2025,
		featured: false,
		scenes: ['trees'],
		portrait: false,
		nl: {
			title: 'Wintersnoei van fruitbomen',
			summary: 'Hoogstam appel- en perenbomen gesnoeid voor een betere oogst.',
			story: '<p>Een boomgaard van twaalf hoogstammen kreeg een vakkundige wintersnoei. Zo komt er licht in de kroon en krijgt u mooier fruit.</p>'
		},
		en: {
			title: 'Winter pruning of fruit trees',
			summary: 'Standard apple and pear trees pruned for a better harvest.',
			story: '<p>An orchard of twelve standard trees received expert winter pruning. This lets light into the crown and gives you better fruit.</p>'
		}
	},
	{
		slug: 'opknapbeurt-verwaarloosde-tuin-bocholt',
		service: 'onderhoud',
		town: 'Bocholt',
		year: 2024,
		featured: true,
		scenes: ['lawn'],
		beforeAfter: ['overgrown', 'hedge'],
		portrait: false,
		nl: {
			title: 'Opknapbeurt van een verwaarloosde tuin',
			summary: 'Na jaren zonder onderhoud: in twee dagen weer een bruikbare tuin.',
			story: '<p>De nieuwe eigenaars kochten een woning met een totaal verwilderde tuin. We ruimden op, snoeiden terug, freesden het gazon en zaaiden opnieuw in.</p>'
		},
		en: {
			title: 'Overgrown garden makeover',
			summary: 'After years without care: a usable garden again in two days.',
			story: '<p>The new owners bought a house with a completely overgrown garden. We cleared, cut back, tilled the lawn and reseeded it.</p>'
		}
	},
	{
		slug: 'terras-met-houten-vlonder-genk',
		service: 'aanleg',
		town: 'Genk',
		year: 2025,
		featured: false,
		scenes: ['terrace'],
		portrait: true,
		nl: {
			title: 'Terras met houten vlonder',
			summary: 'Een warm houten vlonderterras aansluitend op de leefruimte.',
			story: '<p>Het terras in hardhout sluit naadloos aan op de schuifraam. Ingebouwde verlichting maakt het ook \'s avonds gezellig.</p>'
		},
		en: {
			title: 'Terrace with wooden decking',
			summary: 'A warm wooden deck that connects to the living room.',
			story: '<p>The hardwood deck connects seamlessly to the sliding doors. Built-in lighting makes it cosy in the evening too.</p>'
		}
	},
	{
		slug: 'vormsnoei-taxus-neeroeteren',
		service: 'snoeiwerken',
		town: 'Neeroeteren',
		year: 2024,
		featured: false,
		scenes: ['hedge'],
		portrait: true,
		nl: {
			title: 'Vormsnoei van taxus en buxus',
			summary: 'Bollen, blokken en kegels met de hand in vorm geknipt.',
			story: '<p>Vormsnoei vraagt geduld en een vaste hand. We knippen elke vorm met de hand bij, twee keer per jaar.</p>'
		},
		en: {
			title: 'Yew and box topiary',
			summary: 'Balls, blocks and cones hand-clipped into shape.',
			story: '<p>Topiary takes patience and a steady hand. We hand-clip every shape, twice a year.</p>'
		}
	},
	{
		slug: 'graszoden-in-een-dag-meeuwen',
		service: 'gazon',
		town: 'Meeuwen',
		year: 2025,
		featured: false,
		scenes: ['lawn', 'lawn'],
		portrait: false,
		nl: {
			title: 'Graszoden in één dag',
			summary: '450 m² nieuw gazon met graszoden, meteen groen.',
			story: '<p>Na het egaliseren en aanrollen van de grond legden we 450 m² graszoden. Na drie weken kon er al op gespeeld worden.</p>'
		},
		en: {
			title: 'Turf laid in a single day',
			summary: '450 m² of new turf lawn, instantly green.',
			story: '<p>After levelling and rolling the soil we laid 450 m² of turf. Three weeks later the children could already play on it.</p>'
		}
	}
];

export const seedTestimonials = [
	{
		authorName: 'Familie Claes',
		town: 'Maaseik',
		service: 'aanleg',
		rating: 5,
		quoteNl: 'Van ontwerp tot uitvoering perfect opgevolgd. Het terras is prachtig en alles werd netjes opgeruimd. Echte vakmannen!',
		quoteEn: 'Perfectly managed from design to completion. The terrace is beautiful and everything was cleaned up neatly. True craftsmen!',
		source: 'google' as const,
		reviewDate: '2025-08-14'
	},
	{
		authorName: 'Marleen V.',
		town: 'Neeroeteren',
		service: 'onderhoud',
		rating: 5,
		quoteNl: 'Al twee jaar komen ze elke maand langs. Altijd stipt, vriendelijk en de tuin ziet er altijd verzorgd uit.',
		quoteEn: 'They have visited every month for two years. Always on time, friendly, and the garden always looks well kept.',
		source: 'facebook' as const,
		reviewDate: '2025-06-02'
	},
	{
		authorName: 'Tom en Sarah',
		town: 'Opoeteren',
		service: 'gazon',
		rating: 5,
		quoteNl: 'Ons gazon was één grote moslap. Nu ligt er een dicht, groen tapijt. Snel gewerkt en een eerlijke prijs.',
		quoteEn: 'Our lawn was one big patch of moss. Now there is a dense green carpet. Quick work and a fair price.',
		source: 'google' as const,
		reviewDate: '2025-05-20'
	},
	{
		authorName: 'Jan P.',
		town: 'Kinrooi',
		service: 'bomen-snoeien-vellen',
		rating: 5,
		quoteNl: 'Een grote berk vlak naast ons huis werd veilig en zonder schade geveld. Zeer professioneel.',
		quoteEn: 'A large birch right next to our house was felled safely and without any damage. Very professional.',
		source: 'google' as const,
		reviewDate: '2025-03-11'
	},
	{
		authorName: 'Els D.',
		town: 'Bree',
		service: 'snoeiwerken',
		rating: 4,
		quoteNl: 'De hagen staan er weer strak bij. Goede communicatie vooraf en ze kwamen op de afgesproken dag.',
		quoteEn: 'The hedges look sharp again. Good communication beforehand and they came on the agreed day.',
		source: 'facebook' as const,
		reviewDate: '2024-10-28'
	},
	{
		authorName: 'Familie Peeters',
		town: 'Dilsen-Stokkem',
		service: 'aanleg',
		rating: 5,
		quoteNl: 'Onze vijvertuin is het mooiste plekje van het huis geworden. Bedankt voor het meedenken!',
		quoteEn: 'Our pond garden has become the nicest spot of the house. Thanks for thinking along with us!',
		source: 'direct' as const,
		reviewDate: '2024-09-05'
	}
];

export const homeBlocks: { nl: Omit<HomeBlocks, 'heroImageId' | 'whyImageId'>; en: Omit<HomeBlocks, 'heroImageId' | 'whyImageId'> } = {
	nl: {
		heroEyebrow: 'Tuinaanleg & onderhoud · Neeroeteren',
		heroTitle: 'U hoeft enkel te genieten',
		heroText:
			'Wij ontwerpen, leggen aan en onderhouden tuinen in Maaseik en omgeving. Vakwerk met oog voor detail, van strakke hagen tot een volledig nieuwe tuin.',
		stats: [
			{ value: '8+', label: 'jaar ervaring' },
			{ value: '650+', label: 'tuinen verzorgd' },
			{ value: '4,9/5', label: 'gemiddelde score' }
		],
		servicesEyebrow: 'Onze diensten',
		servicesTitle: 'Alles voor uw tuin, door één vaste ploeg',
		servicesText: 'Van eerste aanleg tot wekelijks onderhoud. Kies een dienst en plan meteen een afspraak.',
		whyEyebrow: 'Waarom De Ridder',
		whyTitle: 'Hard werken, zodat u kunt genieten',
		whyText:
			'We zijn een lokaal bedrijf uit Neeroeteren. U heeft één aanspreekpunt, duidelijke afspraken en een ploeg die zorg draagt voor uw tuin alsof het de hare is.',
		features: [
			{ icon: 'leaf', title: 'Duurzaam werken', text: 'Inheemse planten, minder chemie en groenafval dat wordt gerecycleerd.' },
			{ icon: 'hedge', title: 'Vaste ploeg', text: 'Dezelfde mensen in uw tuin, die weten wat u belangrijk vindt.' },
			{ icon: 'sun', title: 'Duidelijke prijzen', text: 'Een heldere offerte vooraf, zonder verrassingen achteraf.' },
			{ icon: 'shovel', title: 'Alles in één', text: 'Ontwerp, aanleg en onderhoud bij één vakman.' }
		],
		projectsEyebrow: 'Realisaties',
		projectsTitle: 'Tuinen waar we trots op zijn',
		testimonialsEyebrow: 'Klanten aan het woord',
		testimonialsTitle: 'Wat onze klanten zeggen'
	},
	en: {
		heroEyebrow: 'Garden design & care · Neeroeteren',
		heroTitle: 'All you have to do is enjoy',
		heroText:
			'We design, build and maintain gardens in Maaseik and the surrounding area. Skilled work with an eye for detail, from crisp hedges to a completely new garden.',
		stats: [
			{ value: '8+', label: 'years of experience' },
			{ value: '650+', label: 'gardens cared for' },
			{ value: '4.9/5', label: 'average rating' }
		],
		servicesEyebrow: 'Our services',
		servicesTitle: 'Everything for your garden, by one regular crew',
		servicesText: 'From a new build to weekly maintenance. Pick a service and book an appointment straight away.',
		whyEyebrow: 'Why De Ridder',
		whyTitle: 'We work hard, so you can enjoy',
		whyText:
			'We are a local company from Neeroeteren. You get one point of contact, clear agreements and a crew that cares for your garden as if it were their own.',
		features: [
			{ icon: 'leaf', title: 'Sustainable work', text: 'Native plants, fewer chemicals and recycled green waste.' },
			{ icon: 'hedge', title: 'One regular crew', text: 'The same people in your garden, who know what matters to you.' },
			{ icon: 'sun', title: 'Clear prices', text: 'A clear quote up front, no surprises afterwards.' },
			{ icon: 'shovel', title: 'All in one', text: 'Design, build and maintenance from one specialist.' }
		],
		projectsEyebrow: 'Projects',
		projectsTitle: 'Gardens we are proud of',
		testimonialsEyebrow: 'In their words',
		testimonialsTitle: 'What our customers say'
	}
};

export const aboutBlocks: { nl: Omit<AboutBlocks, 'imageId'>; en: Omit<AboutBlocks, 'imageId'> } = {
	nl: {
		eyebrow: 'Over ons',
		intro: 'Tuinen De Ridder is een tuinaannemer uit Neeroeteren. We werken voor particulieren en bedrijven in heel Noord-Limburg.',
		story:
			'<p>Wat begon met één aanhangwagen en een grasmaaier, groeide uit tot een vaste ploeg tuinmannen. Onze aanpak bleef dezelfde: hard werken, eerlijk advies en een tuin die er na ons bezoek beter uitziet dan ervoor.</p><p>We kennen de grond, het klimaat en de planten van de streek. Daarom kiezen we voor beplanting die hier thuishoort en weinig water en onderhoud vraagt.</p>',
		valuesTitle: 'Waar we voor staan',
		values: [
			{ icon: 'hedge', title: 'Vakmanschap', text: 'Elke haag recht, elke rand strak. Ook als niemand kijkt.' },
			{ icon: 'leaf', title: 'Respect voor de natuur', text: 'We werken met de natuur, niet ertegen.' },
			{ icon: 'sun', title: 'Duidelijkheid', text: 'Afspraak is afspraak, en een offerte is een offerte.' }
		],
		stats: [
			{ value: '2018', label: 'opgericht' },
			{ value: '5', label: 'vaste medewerkers' },
			{ value: '30 km', label: 'werkgebied rond Neeroeteren' }
		]
	},
	en: {
		eyebrow: 'About us',
		intro: 'Tuinen De Ridder is a landscaping company from Neeroeteren. We work for homeowners and businesses across North Limburg.',
		story:
			'<p>What started with one trailer and a lawnmower grew into a regular crew of gardeners. Our approach stayed the same: hard work, honest advice and a garden that looks better after our visit than before.</p><p>We know the soil, the climate and the plants of the region. That is why we choose planting that belongs here and needs little water and maintenance.</p>',
		valuesTitle: 'What we stand for',
		values: [
			{ icon: 'hedge', title: 'Craftsmanship', text: 'Every hedge straight, every edge crisp. Even when no one is looking.' },
			{ icon: 'leaf', title: 'Respect for nature', text: 'We work with nature, not against it.' },
			{ icon: 'sun', title: 'Clarity', text: 'An agreement is an agreement, and a quote is a quote.' }
		],
		stats: [
			{ value: '2018', label: 'founded' },
			{ value: '5', label: 'permanent staff' },
			{ value: '30 km', label: 'service area around Neeroeteren' }
		]
	}
};

export const contactBlocks: { nl: ContactBlocks; en: ContactBlocks } = {
	nl: {
		eyebrow: 'Contact',
		intro: 'Een vraag over uw tuin? Bel, mail of stuur ons een bericht. We antwoorden binnen één werkdag.'
	},
	en: {
		eyebrow: 'Contact',
		intro: 'A question about your garden? Call, email or send us a message. We reply within one working day.'
	}
};

const legalNote = {
	nl: '<p><em>Demotekst — laat deze tekst nalezen door een jurist vóór de lancering.</em></p>',
	en: '<p><em>Demo text — have this text reviewed by a lawyer before launch.</em></p>'
};

export const legalBlocks: Record<'privacy' | 'cookies' | 'terms', { nl: LegalBlocks & { title: string }; en: LegalBlocks & { title: string } }> = {
	privacy: {
		nl: {
			title: 'Privacybeleid',
			updated: '2026-10-06',
			body: `${legalNote.nl}<h2>Wie zijn wij?</h2><p>Tuinen De Ridder, Bergerstraat 55, 3680 Neeroeteren, BTW BE0676.915.587, is verantwoordelijk voor de verwerking van uw persoonsgegevens.</p><h2>Welke gegevens verwerken we?</h2><p>Wanneer u een afspraak boekt of ons contacteert, verwerken we uw naam, e-mailadres, telefoonnummer, adres en de informatie over uw tuin die u ons geeft (inclusief foto's).</p><h2>Waarom?</h2><ul><li>Om uw afspraak of offerteaanvraag te behandelen (uitvoering van een overeenkomst)</li><li>Om u te herinneren aan uw afspraak</li><li>Om onze boekhouding te voeren (wettelijke verplichting)</li></ul><h2>Hoe lang?</h2><p>Gegevens van afgeronde boekingen worden na 24 maanden geanonimiseerd, tenzij de wet een langere bewaartermijn oplegt.</p><h2>Verwerkers</h2><p>We bewaren gegevens uitsluitend binnen de Europese Unie, bij onze hosting- en databankpartners.</p><h2>Uw rechten</h2><p>U kunt uw gegevens inkijken, laten verbeteren of laten verwijderen via info@tuinen-deridder.be. U kunt ook klacht indienen bij de Gegevensbeschermingsautoriteit.</p>`
		},
		en: {
			title: 'Privacy policy',
			updated: '2026-10-06',
			body: `${legalNote.en}<h2>Who are we?</h2><p>Tuinen De Ridder, Bergerstraat 55, 3680 Neeroeteren, Belgium, VAT BE0676.915.587, is responsible for processing your personal data.</p><h2>What data do we process?</h2><p>When you book an appointment or contact us, we process your name, email address, phone number, address and the information about your garden that you give us (including photos).</p><h2>Why?</h2><ul><li>To handle your appointment or quote request (performance of a contract)</li><li>To remind you of your appointment</li><li>To keep our accounts (legal obligation)</li></ul><h2>How long?</h2><p>Data from completed bookings is anonymised after 24 months, unless the law requires a longer retention period.</p><h2>Processors</h2><p>We store data only within the European Union, with our hosting and database partners.</p><h2>Your rights</h2><p>You can view, correct or delete your data via info@tuinen-deridder.be. You can also file a complaint with the Belgian Data Protection Authority.</p>`
		}
	},
	cookies: {
		nl: {
			title: 'Cookiebeleid',
			updated: '2026-10-06',
			body: `${legalNote.nl}<h2>Welke cookies gebruiken we?</h2><p>Deze website gebruikt enkel functionele cookies die nodig zijn om de site te laten werken:</p><ul><li><strong>tdr_lang</strong> — onthoudt uw taalkeuze (1 jaar)</li><li><strong>tdr_booking</strong> — onthoudt uw keuzes tijdens het boeken (24 uur)</li></ul><p>We gebruiken geen advertentie- of trackingcookies. Bezoekersstatistieken worden cookieloos en anoniem verzameld.</p>`
		},
		en: {
			title: 'Cookie policy',
			updated: '2026-10-06',
			body: `${legalNote.en}<h2>Which cookies do we use?</h2><p>This website only uses functional cookies that are needed for the site to work:</p><ul><li><strong>tdr_lang</strong> — remembers your language choice (1 year)</li><li><strong>tdr_booking</strong> — remembers your choices while booking (24 hours)</li></ul><p>We do not use advertising or tracking cookies. Visitor statistics are collected anonymously without cookies.</p>`
		}
	},
	terms: {
		nl: {
			title: 'Algemene voorwaarden',
			updated: '2026-10-06',
			body: `${legalNote.nl}<h2>1. Toepassing</h2><p>Deze voorwaarden gelden voor alle offertes, boekingen en werken van Tuinen De Ridder.</p><h2>2. Afspraken en annulering</h2><p>Een online boeking is een aanvraag. Ze is definitief zodra wij ze bevestigen. U kunt kosteloos annuleren of verplaatsen tot 48 uur voor de afspraak.</p><h2>3. Weersomstandigheden</h2><p>Bij hevige regen, vorst of storm kunnen wij een afspraak verplaatsen. We nemen dan zo snel mogelijk contact met u op.</p><h2>4. Prijzen</h2><p>Vermelde prijzen zijn vanafprijzen, inclusief btw. De definitieve prijs staat in de offerte of op de factuur.</p>`
		},
		en: {
			title: 'Terms & conditions',
			updated: '2026-10-06',
			body: `${legalNote.en}<h2>1. Scope</h2><p>These terms apply to all quotes, bookings and work by Tuinen De Ridder.</p><h2>2. Appointments and cancellation</h2><p>An online booking is a request. It is final once we confirm it. You can cancel or reschedule free of charge up to 48 hours before the appointment.</p><h2>3. Weather</h2><p>In case of heavy rain, frost or storms we may reschedule an appointment. We will contact you as soon as possible.</p><h2>4. Prices</h2><p>Listed prices are starting prices, including VAT. The final price is stated in the quote or on the invoice.</p>`
		}
	}
};

/** Belgian public holidays + collective leave, preloaded as blackout dates. */
export const seedBlackouts: { date: string; reason: string }[] = [
	{ date: '2026-11-01', reason: 'Allerheiligen' },
	{ date: '2026-11-11', reason: 'Wapenstilstand' },
	{ date: '2026-12-25', reason: 'Kerstmis' },
	{ date: '2026-12-28', reason: 'Collectief verlof' },
	{ date: '2026-12-29', reason: 'Collectief verlof' },
	{ date: '2026-12-30', reason: 'Collectief verlof' },
	{ date: '2026-12-31', reason: 'Collectief verlof' },
	{ date: '2027-01-01', reason: 'Nieuwjaar' },
	{ date: '2027-03-29', reason: 'Paasmaandag' },
	{ date: '2027-05-01', reason: 'Dag van de Arbeid' },
	{ date: '2027-05-06', reason: 'O.L.H. Hemelvaart' },
	{ date: '2027-05-17', reason: 'Pinkstermaandag' },
	{ date: '2027-07-21', reason: 'Nationale feestdag' },
	{ date: '2027-08-15', reason: 'O.L.V. Hemelvaart' },
	{ date: '2027-11-01', reason: 'Allerheiligen' },
	{ date: '2027-11-11', reason: 'Wapenstilstand' },
	{ date: '2027-12-25', reason: 'Kerstmis' }
];

export const seedCustomers = [
	{ name: 'An Vermeulen', email: 'an.vermeulen@example.be', phone: '+32 470 12 34 56', street: 'Kerkstraat 12', postcode: '3680', municipality: 'Maaseik (Neeroeteren / Opoeteren)' },
	{ name: 'Bart Janssen', email: 'bart.janssen@example.be', phone: '+32 471 22 33 44', street: 'Weg naar Bree 88', postcode: '3960', municipality: 'Bree' },
	{ name: 'Caroline Smeets', email: 'caroline.smeets@example.be', phone: '+32 472 98 76 54', street: 'Molenweg 4', postcode: '3640', municipality: 'Kinrooi' },
	{ name: 'Dirk Hendrikx', email: 'dirk.hendrikx@example.be', phone: '+32 473 55 66 77', street: 'Heidestraat 31', postcode: '3650', municipality: 'Dilsen-Stokkem' },
	{ name: 'Evi Claes', email: 'evi.claes@example.be', phone: '+32 474 11 22 33', street: 'Boslaan 7', postcode: '3665', municipality: 'As' },
	{ name: 'Frank Peeters', email: 'frank.peeters@example.be', phone: '+32 475 44 55 66', street: 'Dorpsplein 2', postcode: '3950', municipality: 'Bocholt' },
	{ name: 'Griet Willems', email: 'griet.willems@example.be', phone: '+32 476 77 88 99', street: 'Maasstraat 19', postcode: '3680', municipality: 'Maaseik (Neeroeteren / Opoeteren)' },
	{ name: 'Hans Wouters', email: 'hans.wouters@example.be', phone: '+32 477 10 20 30', street: 'Genkerweg 140', postcode: '3600', municipality: 'Genk' },
	{ name: 'Ilse Maes', email: 'ilse.maes@example.be', phone: '+32 478 40 50 60', street: 'Lindestraat 3', postcode: '3670', municipality: 'Oudsbergen (Meeuwen-Gruitrode)' },
	{ name: 'Jeroen Gielen', email: 'jeroen.gielen@example.be', phone: '+32 479 70 80 90', street: 'Bergerstraat 102', postcode: '3680', municipality: 'Maaseik (Neeroeteren / Opoeteren)' },
	{ name: 'Katrien Bosmans', email: 'katrien.bosmans@example.be', phone: '+32 470 31 41 59', street: 'Stationsstraat 21', postcode: '3630', municipality: 'Maasmechelen' },
	{ name: 'Luc Vanderhoven', email: 'luc.vanderhoven@example.be', phone: '+32 471 26 53 58', street: 'Hoogstraat 64', postcode: '3920', municipality: 'Lommel' },
	{ name: 'Sophie Martens', email: 'sophie.martens@example.com', phone: '+32 472 97 93 23', street: 'Rozenlaan 9', postcode: '3680', municipality: 'Maaseik (Neeroeteren / Opoeteren)', locale: 'en' as const }
];

/**
 * Foundation Vocabulary Data
 * Top 100 most frequent French words with translations, examples, and image keywords
 * Curated from common-french-words.json and enhanced with learning metadata
 */

import { FoundationWord } from "@/types/foundation-vocabulary";

// Map French POS to English category
function mapPosToCategory(pos: string): FoundationWord["category"] {
  const mapping: Record<string, FoundationWord["category"]> = {
    article: "article",
    verb: "verb",
    noun: "noun",
    adjective: "adjective",
    adverb: "adverb",
    preposition: "preposition",
    conjunction: "conjunction",
    pronoun: "pronoun",
    number: "number",
    determiner: "determiner",
    interjection: "interjection",
  };
  return mapping[pos] || "noun";
}

// Determine imageability based on POS and concreteness
function getImageability(pos: string, word: string): "high" | "medium" | "low" {
  // Concrete nouns are highly imageable
  const highImageabilityNouns = [
    "homme",
    "femme",
    "fille",
    "fils",
    "enfant",
    "ami",
    "père",
    "mère",
    "main",
    "œil",
    "tête",
    "pied",
    "cœur",
    "corps",
    "bras",
    "sang",
    "maison",
    "ville",
    "rue",
    "porte",
    "chambre",
    "terre",
    "ciel",
    "soleil",
    "eau",
    "air",
    "lumière",
    "nuit",
    "jour",
    "livre",
    "lettre",
    "voix",
    "monde",
    "pays",
    "roi",
    "guerre",
    "dieu",
  ];

  if (pos === "noun" && highImageabilityNouns.includes(word)) {
    return "high";
  }

  // Most nouns are medium
  if (pos === "noun") {
    return "medium";
  }

  // Action verbs can be visualized
  const imageableVerbs = [
    "aller",
    "voir",
    "faire",
    "prendre",
    "parler",
    "sortir",
    "venir",
    "partir",
    "entrer",
    "rester",
    "donner",
    "porter",
    "écrire",
    "lire",
    "manger",
    "boire",
    "dormir",
    "marcher",
    "courir",
    "tomber",
    "jouer",
    "ouvrir",
    "chercher",
    "toucher",
    "lever",
    "jeter",
    "tirer",
    "mourir",
  ];

  if (pos === "verb" && imageableVerbs.includes(word)) {
    return "medium";
  }

  // Some adjectives can be visualized
  const imageableAdjectives = [
    "grand",
    "petit",
    "nouveau",
    "jeune",
    "vieux",
    "blanc",
    "noir",
    "beau",
    "long",
    "haut",
    "bas",
    "plein",
  ];

  if (pos === "adjective" && imageableAdjectives.includes(word)) {
    return "medium";
  }

  // Numbers can be counted
  if (pos === "number") {
    return "medium";
  }

  // Abstract words, function words
  return "low";
}

// Example sentences for top 100 words
// These are intentionally simple (3-5 words) for beginners
const exampleSentences: Record<string, { french: string; english: string }> = {
  // Articles
  le: { french: "Le chat dort.", english: "The cat sleeps." },
  de: { french: "Le livre de papa.", english: "Dad's book." },
  un: { french: "Un homme marche.", english: "A man walks." },
  du: { french: "Du pain frais.", english: "Some fresh bread." },
  au: { french: "Je vais au parc.", english: "I go to the park." },

  // Pronouns
  il: { french: "Il est grand.", english: "He is tall." },
  je: { french: "Je suis content.", english: "I am happy." },
  elle: { french: "Elle parle vite.", english: "She speaks fast." },
  vous: { french: "Vous êtes gentil.", english: "You are kind." },
  on: { french: "On mange bien.", english: "We eat well." },
  nous: { french: "Nous allons partir.", english: "We are leaving." },
  tu: { french: "Tu es là.", english: "You are here." },
  moi: { french: "C'est pour moi.", english: "It's for me." },
  lui: { french: "Je lui parle.", english: "I talk to him." },
  se: { french: "Il se lave.", english: "He washes himself." },
  qui: { french: "Qui est là?", english: "Who is there?" },
  ce: { french: "Ce livre est bon.", english: "This book is good." },
  me: { french: "Il me voit.", english: "He sees me." },
  y: { french: "J'y vais.", english: "I'm going there." },
  celui: { french: "Celui-ci est bon.", english: "This one is good." },
  cela: { french: "Cela me plaît.", english: "I like that." },
  rien: { french: "Je ne vois rien.", english: "I see nothing." },
  ceux: { french: "Ceux sont grands.", english: "Those are big." },

  // Verbs
  être: { french: "Je suis français.", english: "I am French." },
  avoir: { french: "J'ai un chat.", english: "I have a cat." },
  faire: { french: "Je fais du sport.", english: "I do sports." },
  dire: { french: "Il dit bonjour.", english: "He says hello." },
  pouvoir: { french: "Je peux aider.", english: "I can help." },
  aller: { french: "Je vais bien.", english: "I am fine." },
  voir: { french: "Je vois la mer.", english: "I see the sea." },
  vouloir: { french: "Je veux manger.", english: "I want to eat." },
  savoir: { french: "Je sais nager.", english: "I can swim." },
  sortir: { french: "Je sors ce soir.", english: "I go out tonight." },
  venir: { french: "Il vient demain.", english: "He comes tomorrow." },
  croire: { french: "Je crois cela.", english: "I believe that." },
  demander: { french: "Je demande de l'aide.", english: "I ask for help." },
  trouver: { french: "Je trouve la clé.", english: "I find the key." },
  rendre: { french: "Je rends le livre.", english: "I return the book." },
  poser: { french: "Je pose la question.", english: "I ask the question." },
  prendre: { french: "Je prends le bus.", english: "I take the bus." },
  donner: { french: "Je donne un cadeau.", english: "I give a gift." },
  devenir: { french: "Il devient grand.", english: "He becomes tall." },
  tenir: { french: "Je tiens le livre.", english: "I hold the book." },
  devoir: { french: "Je dois partir.", english: "I must leave." },
  passer: { french: "Je passe devant.", english: "I pass by." },
  mettre: { french: "Je mets mes chaussures.", english: "I put on my shoes." },
  reprendre: {
    french: "Je reprends mon travail.",
    english: "I resume my work.",
  },
  sentir: { french: "Je sens bon.", english: "I smell good." },
  attendre: { french: "J'attends le bus.", english: "I wait for the bus." },
  porter: { french: "Je porte un sac.", english: "I carry a bag." },
  entendre: { french: "J'entends la musique.", english: "I hear the music." },
  suivre: { french: "Je suis le chemin.", english: "I follow the path." },
  connaître: { french: "Je connais Marie.", english: "I know Marie." },
  comprendre: { french: "Je comprends bien.", english: "I understand well." },
  laisser: { french: "Je laisse le livre.", english: "I leave the book." },
  revenir: { french: "Je reviens demain.", english: "I come back tomorrow." },
  sembler: { french: "Il semble content.", english: "He seems happy." },
  appeler: { french: "J'appelle maman.", english: "I call mom." },
  penser: { french: "Je pense à toi.", english: "I think of you." },
  arriver: { french: "J'arrive bientôt.", english: "I arrive soon." },
  perdre: { french: "Je perds mes clés.", english: "I lose my keys." },
  écrire: { french: "J'écris une lettre.", english: "I write a letter." },
  lire: { french: "Je lis un livre.", english: "I read a book." },
  vivre: { french: "Je vis à Paris.", english: "I live in Paris." },
  mourir: { french: "Les fleurs meurent.", english: "The flowers die." },
  jeter: { french: "Je jette la balle.", english: "I throw the ball." },
  tomber: { french: "La feuille tombe.", english: "The leaf falls." },
  tirer: { french: "Je tire la porte.", english: "I pull the door." },
  servir: { french: "Je sers le dîner.", english: "I serve dinner." },
  commencer: { french: "Je commence à lire.", english: "I start reading." },
  jouer: { french: "Je joue au foot.", english: "I play soccer." },
  crier: { french: "Il crie fort.", english: "He shouts loudly." },
  lever: { french: "Je lève la main.", english: "I raise my hand." },
  garder: { french: "Je garde le secret.", english: "I keep the secret." },
  ouvrir: { french: "J'ouvre la porte.", english: "I open the door." },
  chercher: { french: "Je cherche mes clés.", english: "I look for my keys." },
  répondre: {
    french: "Je réponds au téléphone.",
    english: "I answer the phone.",
  },
  toucher: { french: "Je touche le mur.", english: "I touch the wall." },
  aimer: { french: "J'aime la musique.", english: "I love music." },
  recevoir: { french: "Je reçois un cadeau.", english: "I receive a gift." },
  permettre: { french: "Je permets cela.", english: "I allow that." },
  entrer: { french: "J'entre dans la maison.", english: "I enter the house." },
  rester: { french: "Je reste ici.", english: "I stay here." },
  parler: { french: "Je parle français.", english: "I speak French." },
  falloir: { french: "Il faut partir.", english: "We must leave." },

  // Nouns
  homme: { french: "L'homme travaille.", english: "The man works." },
  an: { french: "J'ai dix ans.", english: "I am ten years old." },
  monde: { french: "Le monde est grand.", english: "The world is big." },
  année: {
    french: "Cette année est belle.",
    english: "This year is beautiful.",
  },
  temps: { french: "Le temps passe vite.", english: "Time flies." },
  jour: { french: "C'est un beau jour.", english: "It's a beautiful day." },
  chose: { french: "C'est une bonne chose.", english: "It's a good thing." },
  vie: { french: "La vie est belle.", english: "Life is beautiful." },
  main: { french: "J'ai deux mains.", english: "I have two hands." },
  ville: { french: "La ville est grande.", english: "The city is big." },
  fille: { french: "La fille danse.", english: "The girl dances." },
  heure: { french: "Quelle heure est-il?", english: "What time is it?" },
  semaine: {
    french: "Une semaine a sept jours.",
    english: "A week has seven days.",
  },
  œil: { french: "Mon œil est bleu.", english: "My eye is blue." },
  cas: { french: "C'est un bon cas.", english: "It's a good case." },
  bout: { french: "Le bout du chemin.", english: "The end of the road." },
  question: {
    french: "C'est une bonne question.",
    english: "It's a good question.",
  },
  fois: { french: "Une fois par jour.", english: "Once a day." },
  pays: { french: "Mon pays est grand.", english: "My country is big." },
  femme: { french: "La femme parle.", english: "The woman speaks." },
  moment: { french: "Un bon moment.", english: "A good moment." },
  nom: { french: "Mon nom est Pierre.", english: "My name is Pierre." },
  part: { french: "Une grande part.", english: "A big part." },
  point: { french: "Un bon point.", english: "A good point." },
  terre: { french: "La terre est ronde.", english: "The earth is round." },
  gens: { french: "Les gens sont gentils.", english: "People are kind." },
  côté: { french: "De ce côté.", english: "On this side." },
  maison: { french: "Ma maison est petite.", english: "My house is small." },
  suite: { french: "À la suite.", english: "Following." },
  place: { french: "La place est grande.", english: "The square is big." },
  tête: { french: "Ma tête est ronde.", english: "My head is round." },
  état: { french: "Un bon état.", english: "A good condition." },
  force: { french: "Avec force.", english: "With force." },
  voix: { french: "Une belle voix.", english: "A beautiful voice." },
  eau: { french: "L'eau est claire.", english: "The water is clear." },
  fait: { french: "C'est un fait.", english: "It's a fact." },
  mot: { french: "Un seul mot.", english: "Only one word." },
  compte: { french: "Mon compte est bon.", english: "My account is good." },
  milieu: { french: "Au milieu.", english: "In the middle." },
  travail: { french: "Le travail est dur.", english: "Work is hard." },
  nuit: { french: "La nuit est noire.", english: "The night is dark." },
  air: { french: "L'air est frais.", english: "The air is fresh." },
  père: { french: "Mon père travaille.", english: "My father works." },
  ami: { french: "Mon ami est là.", english: "My friend is here." },
  cœur: { french: "Mon cœur bat.", english: "My heart beats." },
  sorte: { french: "Une sorte de...", english: "A kind of..." },
  mère: { french: "Ma mère cuisine.", english: "My mother cooks." },
  soir: { french: "Ce soir est beau.", english: "This evening is beautiful." },
  raison: { french: "Tu as raison.", english: "You are right." },
  coup: { french: "Un seul coup.", english: "Just one blow." },
  monsieur: { french: "Bonjour monsieur.", english: "Hello sir." },
  personne: { french: "Une bonne personne.", english: "A good person." },
  esprit: { french: "Un grand esprit.", english: "A great mind." },
  porte: { french: "La porte est ouverte.", english: "The door is open." },
  mouvement: { french: "Un beau mouvement.", english: "A beautiful movement." },
  roi: { french: "Le roi est bon.", english: "The king is good." },
  rue: { french: "La rue est longue.", english: "The street is long." },
  pied: { french: "Mon pied droit.", english: "My right foot." },
  guerre: { french: "La guerre est finie.", english: "The war is over." },
  pensée: { french: "Une belle pensée.", english: "A beautiful thought." },
  corps: { french: "Mon corps est fort.", english: "My body is strong." },
  peuple: { french: "Le peuple parle.", english: "The people speak." },
  fond: { french: "Au fond du cœur.", english: "Deep in the heart." },
  effet: { french: "Un bon effet.", english: "A good effect." },
  genre: { french: "Ce genre de chose.", english: "This kind of thing." },
  bonheur: { french: "Le bonheur est là.", english: "Happiness is here." },
  livre: { french: "Un bon livre.", english: "A good book." },
  forme: { french: "Une belle forme.", english: "A beautiful shape." },
  ordre: { french: "En bon ordre.", english: "In good order." },
  face: { french: "Face à face.", english: "Face to face." },
  action: { french: "Une bonne action.", english: "A good action." },
  politique: { french: "La politique française.", english: "French politics." },
  rapport: { french: "Un bon rapport.", english: "A good report." },
  bras: { french: "Mes deux bras.", english: "My two arms." },
  besoin: { french: "J'ai besoin d'aide.", english: "I need help." },
  dieu: { french: "Mon Dieu!", english: "My God!" },
  société: { french: "Une grande société.", english: "A large company." },
  figure: { french: "Une belle figure.", english: "A beautiful face." },
  matin: {
    french: "Ce matin est beau.",
    english: "This morning is beautiful.",
  },
  sens: { french: "Cela a du sens.", english: "It makes sense." },
  idée: { french: "Une bonne idée.", english: "A good idea." },
  histoire: { french: "Une belle histoire.", english: "A beautiful story." },
  affaire: { french: "Une bonne affaire.", english: "A good deal." },
  fin: { french: "À la fin.", english: "At the end." },
  lumière: { french: "La lumière brille.", english: "The light shines." },
  sang: { french: "Mon sang rouge.", english: "My red blood." },
  famille: { french: "Ma famille est grande.", english: "My family is big." },
  mort: { french: "La mort est certaine.", english: "Death is certain." },
  amour: { french: "L'amour est beau.", english: "Love is beautiful." },
  manière: { french: "De cette manière.", english: "In this way." },
  parole: { french: "Une belle parole.", english: "A beautiful word." },
  chambre: { french: "Ma chambre est petite.", english: "My room is small." },
  lettre: { french: "Une longue lettre.", english: "A long letter." },
  ciel: { french: "Le ciel est bleu.", english: "The sky is blue." },
  nature: { french: "La nature est belle.", english: "Nature is beautiful." },
  intérêt: { french: "Un grand intérêt.", english: "A great interest." },
  âme: { french: "Une belle âme.", english: "A beautiful soul." },
  mal: { french: "J'ai mal.", english: "I hurt." },
  objet: { french: "Un bel objet.", english: "A beautiful object." },
  front: { french: "Mon front est haut.", english: "My forehead is high." },
  lieu: { french: "Un bon lieu.", english: "A good place." },
  groupe: { french: "Un grand groupe.", english: "A large group." },
  problème: { french: "Un grand problème.", english: "A big problem." },
  peine: { french: "Avec peine.", english: "With difficulty." },
  fils: { french: "Mon fils joue.", english: "My son plays." },
  soleil: { french: "Le soleil brille.", english: "The sun shines." },
  tour: { french: "Le tour du monde.", english: "Around the world." },
  cause: { french: "La cause est juste.", english: "The cause is just." },
  image: { french: "Une belle image.", english: "A beautiful image." },
  route: { french: "La route est longue.", english: "The road is long." },
  début: { french: "Au début.", english: "At the beginning." },
  pièce: { french: "Une grande pièce.", english: "A large room." },
  étude: { french: "Une bonne étude.", english: "A good study." },
  enfant: { french: "L'enfant joue.", english: "The child plays." },
  droit: { french: "C'est mon droit.", english: "It's my right." },
  gouvernement: {
    french: "Le gouvernement français.",
    english: "The French government.",
  },

  // Adjectives
  autre: { french: "Un autre jour.", english: "Another day." },
  nouveau: { french: "Un nouveau livre.", english: "A new book." },
  grand: { french: "Un grand homme.", english: "A great man." },
  petit: { french: "Un petit chat.", english: "A small cat." },
  certain: { french: "C'est certain.", english: "It's certain." },
  premier: { french: "Le premier jour.", english: "The first day." },
  dernier: { french: "Le dernier train.", english: "The last train." },
  jeune: { french: "Une jeune fille.", english: "A young girl." },
  beau: { french: "Un beau jour.", english: "A beautiful day." },
  blanc: { french: "Un chat blanc.", english: "A white cat." },
  noir: { french: "Un chat noir.", english: "A black cat." },
  vrai: { french: "C'est vrai.", english: "It's true." },
  ancien: { french: "Un ancien ami.", english: "An old friend." },
  haut: { french: "Un mur haut.", english: "A high wall." },
  public: { french: "Le jardin public.", english: "The public garden." },
  bas: { french: "Un prix bas.", english: "A low price." },
  possible: { french: "C'est possible.", english: "It's possible." },
  long: { french: "Une longue route.", english: "A long road." },
  seul: { french: "Je suis seul.", english: "I am alone." },
  naturel: { french: "C'est naturel.", english: "It's natural." },
  général: { french: "En général.", english: "In general." },
  présent: { french: "Le temps présent.", english: "The present time." },
  propre: { french: "Ma propre maison.", english: "My own house." },
  simple: { french: "C'est simple.", english: "It's simple." },
  vieux: { french: "Un vieux livre.", english: "An old book." },
  plein: { french: "Un verre plein.", english: "A full glass." },
  français: {
    french: "Le français est beau.",
    english: "French is beautiful.",
  },

  // Adverbs
  ne: { french: "Je ne sais pas.", english: "I don't know." },
  pas: { french: "Pas encore.", english: "Not yet." },
  plus: { french: "Plus tard.", english: "Later." },
  bien: { french: "Très bien.", english: "Very well." },
  où: { french: "Où es-tu?", english: "Where are you?" },
  aussi: { french: "Moi aussi.", english: "Me too." },
  très: { french: "Très bon.", english: "Very good." },
  alors: { french: "Alors, partons!", english: "So, let's go!" },
  encore: { french: "Encore une fois.", english: "One more time." },
  même: { french: "Le même jour.", english: "The same day." },
  toujours: { french: "Je t'aime toujours.", english: "I always love you." },
  tant: { french: "Tant mieux.", english: "So much the better." },
  peu: { french: "Un peu.", english: "A little." },
  jamais: { french: "Jamais plus.", english: "Never again." },
  trop: { french: "C'est trop.", english: "It's too much." },
  "là-bas": { french: "Il est là-bas.", english: "He is over there." },
  voilà: { french: "Voilà mon ami.", english: "Here is my friend." },
  pourquoi: { french: "Pourquoi pas?", english: "Why not?" },
  maintenant: { french: "Maintenant, je pars.", english: "Now, I leave." },
  surtout: { french: "Surtout toi.", english: "Especially you." },
  ensemble: { french: "Tous ensemble.", english: "All together." },
  cependant: { french: "Cependant, je reste.", english: "However, I stay." },
  tard: { french: "Il est tard.", english: "It's late." },
  "aujourd'hui": { french: "C'est aujourd'hui.", english: "It's today." },
  ailleurs: { french: "Partons ailleurs.", english: "Let's go elsewhere." },
  presque: { french: "Presque fini.", english: "Almost done." },
  ainsi: { french: "C'est ainsi.", english: "It is so." },
  moins: { french: "Moins de temps.", english: "Less time." },
  déjà: { french: "C'est déjà fait.", english: "It's already done." },
  enfin: { french: "Enfin libre!", english: "Finally free!" },
  autour: { french: "Autour de moi.", english: "Around me." },
  loin: { french: "Très loin.", english: "Very far." },
  mieux: { french: "C'est mieux.", english: "It's better." },
  oui: { french: "Oui, merci.", english: "Yes, thank you." },

  // Prepositions
  à: { french: "Je vais à Paris.", english: "I go to Paris." },
  dans: { french: "Dans la maison.", english: "In the house." },
  en: { french: "En France.", english: "In France." },
  pour: { french: "Pour toi.", english: "For you." },
  par: { french: "Par ici.", english: "This way." },
  sur: { french: "Sur la table.", english: "On the table." },
  avec: { french: "Avec moi.", english: "With me." },
  sans: { french: "Sans toi.", english: "Without you." },
  après: { french: "Après demain.", english: "After tomorrow." },
  chez: { french: "Chez moi.", english: "At my place." },
  depuis: { french: "Depuis hier.", english: "Since yesterday." },
  contre: { french: "Contre le mur.", english: "Against the wall." },
  sous: { french: "Sous la table.", english: "Under the table." },
  vers: { french: "Vers Paris.", english: "Towards Paris." },
  devant: { french: "Devant la porte.", english: "In front of the door." },
  avant: { french: "Avant toi.", english: "Before you." },
  entre: { french: "Entre nous.", english: "Between us." },

  // Conjunctions
  et: { french: "Toi et moi.", english: "You and me." },
  que: { french: "Je pense que oui.", english: "I think so." },
  comme: { french: "Comme toi.", english: "Like you." },
  mais: { french: "Mais non!", english: "But no!" },
  ou: { french: "Oui ou non?", english: "Yes or no?" },
  si: { french: "Si tu veux.", english: "If you want." },
  parce: {
    french: "Parce que c'est beau.",
    english: "Because it's beautiful.",
  },
  puisque: { french: "Puisque tu le dis.", english: "Since you say so." },
  quand: { french: "Quand tu veux.", english: "Whenever you want." },
  soit: {
    french: "Soit l'un, soit l'autre.",
    english: "Either one or the other.",
  },

  // Determiners
  son: { french: "Son livre.", english: "His/her book." },
  tout: { french: "Tout le monde.", english: "Everyone." },
  leur: { french: "Leur maison.", english: "Their house." },
  notre: { french: "Notre famille.", english: "Our family." },
  ces: { french: "Ces livres.", english: "These books." },
  quelque: { french: "Quelque chose.", english: "Something." },
  mon: { french: "Mon ami.", english: "My friend." },
  chaque: { french: "Chaque jour.", english: "Every day." },
  ton: { french: "Ton livre.", english: "Your book." },

  // Numbers
  deux: { french: "J'ai deux chats.", english: "I have two cats." },
  trois: { french: "Trois amis.", english: "Three friends." },
  quatre: { french: "Quatre saisons.", english: "Four seasons." },
  cinq: { french: "Cinq doigts.", english: "Five fingers." },
  dix: { french: "Dix ans.", english: "Ten years." },
};

// Translate French words to English
const translations: Record<string, string> = {
  // Articles
  le: "the",
  de: "of, from",
  un: "a, an",
  du: "some, of the",
  au: "to the, at the",

  // Pronouns
  il: "he, it",
  je: "I",
  son: "his, her, its",
  que: "that, which, what",
  se: "oneself",
  qui: "who, which",
  ce: "this, that, it",
  elle: "she, it",
  vous: "you",
  me: "me",
  on: "one, we",
  mon: "my",
  lui: "him, to him",
  nous: "we, us",
  tu: "you",
  moi: "me",
  y: "there",
  leur: "their",
  tout: "all, everything",
  notre: "our",
  ces: "these, those",
  celui: "the one, that",
  quelque: "some",
  cela: "that",
  rien: "nothing",
  ceux: "those, the ones",
  chaque: "each, every",
  ton: "your",

  // Verbs
  être: "to be",
  avoir: "to have",
  faire: "to do, to make",
  dire: "to say, to tell",
  pouvoir: "to be able, can",
  aller: "to go",
  voir: "to see",
  vouloir: "to want",
  savoir: "to know",
  sortir: "to go out, to leave",
  venir: "to come",
  croire: "to believe",
  demander: "to ask",
  trouver: "to find",
  rendre: "to give back, to make",
  poser: "to put, to ask",
  prendre: "to take",
  donner: "to give",
  devenir: "to become",
  tenir: "to hold",
  devoir: "to have to, must",
  passer: "to pass, to spend",
  mettre: "to put",
  reprendre: "to resume, to take back",
  sentir: "to feel, to smell",
  attendre: "to wait",
  porter: "to carry, to wear",
  entendre: "to hear",
  suivre: "to follow",
  connaître: "to know",
  comprendre: "to understand",
  laisser: "to leave, to let",
  revenir: "to come back",
  sembler: "to seem",
  appeler: "to call",
  penser: "to think",
  arriver: "to arrive",
  perdre: "to lose",
  écrire: "to write",
  lire: "to read",
  vivre: "to live",
  mourir: "to die",
  jeter: "to throw",
  tomber: "to fall",
  tirer: "to pull, to shoot",
  servir: "to serve",
  commencer: "to begin, to start",
  jouer: "to play",
  crier: "to shout",
  lever: "to raise",
  garder: "to keep",
  ouvrir: "to open",
  chercher: "to look for, to search",
  répondre: "to answer",
  toucher: "to touch",
  aimer: "to love, to like",
  recevoir: "to receive",
  permettre: "to allow",
  entrer: "to enter",
  rester: "to stay",
  parler: "to speak",
  falloir: "to be necessary",
  partir: "to leave",

  // Nouns
  homme: "man",
  an: "year",
  monde: "world",
  année: "year",
  temps: "time, weather",
  jour: "day",
  chose: "thing",
  vie: "life",
  main: "hand",
  ville: "city",
  fille: "girl, daughter",
  heure: "hour, time",
  semaine: "week",
  œil: "eye",
  cas: "case",
  bout: "end, piece",
  question: "question",
  fois: "time (occasion)",
  pays: "country",
  femme: "woman, wife",
  moment: "moment",
  nom: "name",
  part: "part, share",
  point: "point",
  terre: "earth, land",
  gens: "people",
  côté: "side",
  maison: "house",
  suite: "continuation, suite",
  place: "place, square",
  tête: "head",
  état: "state, condition",
  force: "force, strength",
  voix: "voice",
  eau: "water",
  fait: "fact",
  mot: "word",
  compte: "account",
  milieu: "middle, environment",
  travail: "work",
  nuit: "night",
  air: "air",
  père: "father",
  ami: "friend",
  cœur: "heart",
  sorte: "sort, kind",
  mère: "mother",
  soir: "evening",
  raison: "reason",
  coup: "blow, hit",
  monsieur: "mister, sir",
  personne: "person",
  esprit: "mind, spirit",
  porte: "door",
  mouvement: "movement",
  roi: "king",
  rue: "street",
  pied: "foot",
  guerre: "war",
  pensée: "thought",
  corps: "body",
  peuple: "people (nation)",
  fond: "bottom, background",
  effet: "effect",
  genre: "kind, type",
  bonheur: "happiness",
  livre: "book",
  forme: "form, shape",
  ordre: "order",
  face: "face",
  action: "action",
  politique: "politics, policy",
  rapport: "report, relationship",
  bras: "arm",
  besoin: "need",
  dieu: "god",
  société: "society, company",
  figure: "face, figure",
  matin: "morning",
  sens: "sense, meaning",
  idée: "idea",
  histoire: "story, history",
  affaire: "matter, business",
  fin: "end",
  lumière: "light",
  sang: "blood",
  famille: "family",
  mort: "death",
  amour: "love",
  manière: "way, manner",
  parole: "word, speech",
  chambre: "room, bedroom",
  lettre: "letter",
  ciel: "sky, heaven",
  nature: "nature",
  intérêt: "interest",
  âme: "soul",
  mal: "evil, pain",
  objet: "object",
  front: "forehead, front",
  lieu: "place",
  groupe: "group",
  problème: "problem",
  peine: "pain, sorrow",
  fils: "son",
  soleil: "sun",
  tour: "tower, tour",
  cause: "cause",
  image: "image, picture",
  route: "road, route",
  début: "beginning",
  pièce: "room, piece",
  étude: "study",
  enfant: "child",
  droit: "right, law",
  gouvernement: "government",

  // Adjectives
  autre: "other",
  nouveau: "new",
  grand: "big, great",
  petit: "small, little",
  certain: "certain, sure",
  premier: "first",
  dernier: "last",
  jeune: "young",
  beau: "beautiful, handsome",
  blanc: "white",
  noir: "black",
  vrai: "true",
  ancien: "old, former",
  haut: "high, tall",
  public: "public",
  bas: "low",
  possible: "possible",
  long: "long",
  seul: "alone, only",
  naturel: "natural",
  général: "general",
  présent: "present",
  propre: "own, clean",
  simple: "simple",
  vieux: "old",
  plein: "full",
  français: "French",

  // Adverbs
  ne: "not (part of negation)",
  pas: "not, step",
  plus: "more, no longer",
  bien: "well, good",
  où: "where",
  aussi: "also, too",
  très: "very",
  alors: "then, so",
  encore: "still, again",
  même: "same, even",
  toujours: "always, still",
  tant: "so much",
  peu: "little, few",
  jamais: "never",
  trop: "too much",
  "là-bas": "over there",
  voilà: "here is, there is",
  pourquoi: "why",
  maintenant: "now",
  surtout: "especially",
  ensemble: "together",
  cependant: "however",
  tard: "late",
  "aujourd'hui": "today",
  ailleurs: "elsewhere",
  presque: "almost",
  ainsi: "thus, so",
  moins: "less",
  déjà: "already",
  enfin: "finally",
  autour: "around",
  loin: "far",
  mieux: "better",
  oui: "yes",
  seulement: "only",

  // Prepositions
  à: "to, at",
  dans: "in",
  en: "in, to",
  pour: "for",
  par: "by, through",
  sur: "on",
  avec: "with",
  sans: "without",
  après: "after",
  chez: "at (someone's place)",
  depuis: "since, for",
  contre: "against",
  sous: "under",
  vers: "towards",
  devant: "in front of",
  avant: "before",
  entre: "between",

  // Conjunctions
  et: "and",
  comme: "like, as",
  mais: "but",
  ou: "or",
  si: "if",
  parce: "because",
  puisque: "since",
  quand: "when",
  soit: "either, or",

  // Numbers
  deux: "two",
  trois: "three",
  quatre: "four",
  cinq: "five",
  dix: "ten",
};

// Image keywords for each word (for image search)
// For abstract words (articles, pronouns, prepositions), we use related concepts or fallback
const imageKeywords: Record<string, string> = {
  // People - concrete
  homme: "man",
  femme: "woman",
  fille: "girl",
  fils: "son",
  enfant: "child",
  ami: "friend",
  père: "father",
  mère: "mother",
  roi: "king",
  personne: "person",
  monsieur: "sir",
  peuple: "people",
  gens: "people",

  // Body parts - concrete
  main: "hand",
  œil: "eye",
  tête: "head",
  pied: "foot",
  cœur: "heart",
  corps: "body",
  bras: "arm",
  sang: "blood",
  front: "face",

  // Places - concrete
  maison: "house",
  ville: "city",
  rue: "street",
  porte: "door",
  chambre: "room",
  terre: "earth",
  monde: "world",
  pays: "country",
  place: "place",
  lieu: "place",

  // Nature - concrete
  ciel: "sky",
  soleil: "sun",
  eau: "water",
  air: "air",
  lumière: "light",
  nature: "nature",

  // Time - semi-concrete (clock/calendar images)
  nuit: "night",
  jour: "day",
  temps: "time",
  heure: "hour",
  an: "year",
  année: "year",
  semaine: "week",
  matin: "morning",
  soir: "evening",
  moment: "moment",
  fois: "one",

  // Objects - concrete
  livre: "book",
  lettre: "letter",
  chose: "thing",
  objet: "object",
  pièce: "room",
  image: "image",
  route: "road",

  // Actions/Verbs - represented by people doing them
  être: "person", // abstract but use person as fallback
  avoir: "hold", // having = holding
  faire: "work", // doing = working
  dire: "speak", // saying = speaking
  aller: "go", // going
  voir: "see", // seeing
  vouloir: "want", // wanting
  pouvoir: "power", // can/power
  savoir: "know", // knowing (lightbulb/brain)
  prendre: "take", // taking/grabbing
  donner: "give", // giving
  parler: "speak", // speaking
  écrire: "write", // writing
  lire: "read", // reading
  jouer: "play", // playing
  ouvrir: "open", // opening door
  venir: "come", // coming/arriving
  sortir: "leave", // leaving/exiting
  croire: "think", // believing = thinking
  demander: "ask", // asking
  trouver: "find", // finding/searching
  rendre: "return", // returning
  poser: "question", // to pose a question
  partir: "leave", // leaving
  devenir: "new", // becoming = transformation
  tenir: "hold", // holding
  devoir: "work", // must/duty
  passer: "walk", // passing by
  mettre: "hand", // putting
  reprendre: "take", // taking back
  sentir: "feel", // feeling
  attendre: "wait", // waiting
  porter: "carry", // carrying
  entendre: "listen", // hearing
  suivre: "follow", // following
  connaître: "friend", // knowing someone
  comprendre: "know", // understanding
  laisser: "leave", // leaving
  revenir: "return", // coming back
  sembler: "think", // seeming
  appeler: "call", // calling
  penser: "think", // thinking
  arriver: "come", // arriving
  perdre: "lose", // losing
  vivre: "live", // living
  mourir: "die", // dying
  jeter: "throw", // throwing - needs specific image
  tomber: "fall", // falling
  tirer: "pull", // pulling - needs specific image
  servir: "give", // serving
  commencer: "beginning", // starting
  crier: "speak", // shouting
  lever: "hand", // raising
  garder: "hold", // keeping
  chercher: "search", // searching
  répondre: "answer", // answering
  toucher: "touch", // touching
  aimer: "love", // loving
  recevoir: "give", // receiving
  permettre: "hand", // allowing
  entrer: "enter", // entering
  rester: "stay", // staying
  falloir: "need", // necessary

  // Adjectives - use visual examples
  grand: "big",
  petit: "small",
  nouveau: "new",
  vieux: "old",
  jeune: "young",
  beau: "beautiful",
  blanc: "white",
  noir: "black",
  autre: "two", // other = multiple things
  certain: "certain",
  premier: "first",
  dernier: "last",
  long: "long",
  seul: "alone",
  naturel: "natural",
  général: "general",
  présent: "present",
  propre: "own",
  simple: "simple",
  plein: "full",
  français: "french",
  haut: "high",
  public: "public",
  bas: "low",
  possible: "possible",
  vrai: "true",
  ancien: "old",

  // Numbers - show quantity
  deux: "two",
  trois: "three",
  quatre: "four",
  cinq: "five",
  dix: "ten",

  // Abstract concepts - use symbolic representations
  travail: "work",
  idée: "idea",
  histoire: "story",
  question: "question",
  problème: "problem",
  forme: "form",
  amour: "love",
  bonheur: "happiness",
  force: "force",
  sens: "sense",
  raison: "reason",
  vie: "life",
  mort: "death",
  voix: "voice",
  guerre: "war",
  dieu: "god",
  famille: "family",
  esprit: "spirit",
  pensée: "thought",
  mot: "word",
  nom: "name",
  cas: "case",
  bout: "end",
  part: "part",
  point: "point",
  état: "state",
  fait: "truth",
  compte: "account",
  milieu: "middle",
  côté: "side",
  suite: "follow",
  fond: "end",
  effet: "effect",
  genre: "kind",
  ordre: "order",
  face: "face",
  action: "action",
  politique: "politics",
  rapport: "report",
  besoin: "need",
  société: "society",
  figure: "figure",
  affaire: "affair",
  fin: "end",
  manière: "way",
  parole: "voice",
  intérêt: "interest",
  âme: "soul",
  mal: "pain",
  tour: "tour",
  cause: "cause",
  début: "beginning",
  étude: "study",
  droit: "right",
  gouvernement: "government",
  mouvement: "movement",
  peine: "pain",
  coup: "force",

  // Function words - use abstract visuals or fallback
  // Articles, pronouns, prepositions, conjunctions typically get fallback Picsum images
  le: "the",
  de: "point",
  un: "one",
  du: "bread",
  au: "house",
  il: "man",
  je: "person",
  son: "person",
  que: "question",
  se: "person",
  qui: "person",
  ce: "point",
  dans: "house",
  en: "house",
  elle: "woman",
  vous: "person",
  par: "way",
  sur: "hand",
  me: "person",
  on: "people",
  mon: "person",
  lui: "person",
  nous: "people",
  comme: "two",
  mais: "hand",
  avec: "people",
  tout: "group",
  y: "point",
  sans: "alone",
  tu: "person",
  ou: "two",
  leur: "people",
  si: "question",
  moi: "person",
  notre: "people",
  aussi: "two",
  très: "force",
  ces: "group",
  celui: "person",
  quelque: "thing",
  rien: "alone",
  tant: "group",
  peu: "small",
  même: "two",
  toujours: "time",
  alors: "time",
  après: "time",
  chez: "house",
  encore: "time",
  ne: "hand",
  pas: "walk",
  plus: "group",
  bien: "good",
  où: "place",
  jamais: "time",
  trop: "group",
  "là-bas": "place",
  voilà: "hand",
  pourquoi: "question",
  maintenant: "time",
  surtout: "force",
  ensemble: "people",
  cependant: "hand",
  tard: "night",
  "aujourd'hui": "day",
  ailleurs: "place",
  presque: "group",
  ainsi: "way",
  moins: "small",
  déjà: "time",
  enfin: "end",
  autour: "people",
  loin: "road",
  mieux: "good",
  oui: "yes",
  seulement: "one",
  à: "point",
  et: "group",
  pour: "gift", // for = giving
  depuis: "time",
  contre: "force",
  sous: "low",
  vers: "road",
  devant: "front",
  avant: "beginning",
  entre: "middle",
  parce: "reason",
  puisque: "reason",
  quand: "time",
  soit: "two",
  chaque: "one",
  ton: "person",
};

/**
 * Generate foundation vocabulary from common-french-words.json data
 * Takes the top 100 words and enriches them with learning metadata
 */
export function generateFoundationVocabulary(
  rawWords: Array<{ word: string; rank: number; pos: string; lemma: string }>,
): FoundationWord[] {
  // Take top 100 words
  const top100 = rawWords.slice(0, 100);

  return top100.map((raw) => {
    const example = exampleSentences[raw.word] || {
      french: `Le mot "${raw.word}".`,
      english: `The word "${raw.word}".`,
    };

    return {
      id: `foundation-${raw.rank}`,
      word: raw.word,
      lemma: raw.lemma,
      rank: raw.rank,
      pos: raw.pos,
      translation: translations[raw.word] || raw.word,
      exampleSentence: example,
      imageKeyword:
        imageKeywords[raw.word] ||
        translations[raw.word]?.split(",")[0]?.trim() ||
        raw.word,
      imageability: getImageability(raw.pos, raw.word),
      category: mapPosToCategory(raw.pos),
      audioUrl: `/audio/foundation/${raw.word}.mp3`,
    };
  });
}

/**
 * Group words into learning sessions (4 words per session)
 * Prioritizes by: frequency + imageability + usefulness in sentences
 */
export function createLearningSessions(
  words: FoundationWord[],
  wordsPerSession: number = 4,
): FoundationWord[][] {
  // Sort by priority: high imageability first, then by frequency rank
  const sorted = [...words].sort((a, b) => {
    // Prioritize high imageability
    const imageabilityScore = { high: 3, medium: 2, low: 1 };
    const aScore = imageabilityScore[a.imageability];
    const bScore = imageabilityScore[b.imageability];

    if (aScore !== bScore) {
      return bScore - aScore; // Higher imageability first
    }

    // Then by frequency rank (lower rank = more frequent)
    return a.rank - b.rank;
  });

  // Group into sessions
  const sessions: FoundationWord[][] = [];
  for (let i = 0; i < sorted.length; i += wordsPerSession) {
    sessions.push(sorted.slice(i, i + wordsPerSession));
  }

  return sessions;
}

/**
 * Get words suitable for exercises (have images)
 * Filters to words with medium or high imageability
 */
export function getImageableWords(words: FoundationWord[]): FoundationWord[] {
  return words.filter((w) => w.imageability !== "low");
}

/**
 * Get distractor words for multiple choice exercises
 * Returns words from the same category that are different from the target
 */
export function getDistractorWords(
  target: FoundationWord,
  allWords: FoundationWord[],
  count: number = 3,
): FoundationWord[] {
  // Prefer same category for harder distractors
  const sameCategory = allWords.filter(
    (w) =>
      w.id !== target.id &&
      w.category === target.category &&
      w.imageability !== "low",
  );

  // Fall back to any imageable words
  const otherWords = allWords.filter(
    (w) =>
      w.id !== target.id &&
      w.category !== target.category &&
      w.imageability !== "low",
  );

  // Shuffle and combine
  const shuffled = [
    ...sameCategory.sort(() => Math.random() - 0.5),
    ...otherWords.sort(() => Math.random() - 0.5),
  ];

  return shuffled.slice(0, count);
}

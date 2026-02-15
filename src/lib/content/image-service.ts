/**
 * Online Image Service
 * Uses curated Pexels images and Picsum Photos for fallback
 * All images are loaded from the cloud - nothing stored locally
 */

import { ImageSearchResult } from "@/types/foundation-vocabulary";

// Picsum Photos API for random placeholder images (reliable fallback)
const PICSUM_BASE = "https://picsum.photos";

// Pexels direct image URLs (curated for common vocabulary words)
// These are pre-selected images that work well for language learning
const PEXELS_IMAGES: Record<string, string> = {
  // Articles & Determiners - abstract, use simple visuals
  the: "https://images.pexels.com/photos/3768/hand-finger-pointing-show.jpg?auto=compress&cs=tinysrgb&w=400",
  a: "https://images.pexels.com/photos/3768/hand-finger-pointing-show.jpg?auto=compress&cs=tinysrgb&w=400",

  // Common objects
  book: "https://images.pexels.com/photos/256450/pexels-photo-256450.jpeg?auto=compress&cs=tinysrgb&w=400",
  water:
    "https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=400",
  house:
    "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=400",
  car: "https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=400",
  food: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  tree: "https://images.pexels.com/photos/1632790/pexels-photo-1632790.jpeg?auto=compress&cs=tinysrgb&w=400",
  sun: "https://images.pexels.com/photos/87611/sun-sunlight-grasses-sky-87611.jpeg?auto=compress&cs=tinysrgb&w=400",
  sky: "https://images.pexels.com/photos/281260/pexels-photo-281260.jpeg?auto=compress&cs=tinysrgb&w=400",

  // People
  man: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400",
  woman:
    "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400",
  child:
    "https://images.pexels.com/photos/1556704/pexels-photo-1556704.jpeg?auto=compress&cs=tinysrgb&w=400",
  friend:
    "https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg?auto=compress&cs=tinysrgb&w=400",
  family:
    "https://images.pexels.com/photos/1128317/pexels-photo-1128317.jpeg?auto=compress&cs=tinysrgb&w=400",
  father:
    "https://images.pexels.com/photos/1043142/pexels-photo-1043142.jpeg?auto=compress&cs=tinysrgb&w=400",
  mother:
    "https://images.pexels.com/photos/1139793/pexels-photo-1139793.jpeg?auto=compress&cs=tinysrgb&w=400",
  girl: "https://images.pexels.com/photos/1462636/pexels-photo-1462636.jpeg?auto=compress&cs=tinysrgb&w=400",
  son: "https://images.pexels.com/photos/5876431/pexels-photo-5876431.jpeg?auto=compress&cs=tinysrgb&w=400",

  // Body parts
  hand: "https://images.pexels.com/photos/3912994/pexels-photo-3912994.jpeg?auto=compress&cs=tinysrgb&w=400",
  eye: "https://images.pexels.com/photos/1486064/pexels-photo-1486064.jpeg?auto=compress&cs=tinysrgb&w=400",
  head: "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=400",
  foot: "https://images.pexels.com/photos/2387397/pexels-photo-2387397.jpeg?auto=compress&cs=tinysrgb&w=400",
  heart:
    "https://images.pexels.com/photos/1820567/pexels-photo-1820567.jpeg?auto=compress&cs=tinysrgb&w=400",
  arm: "https://images.pexels.com/photos/3768595/pexels-photo-3768595.jpeg?auto=compress&cs=tinysrgb&w=400",
  body: "https://images.pexels.com/photos/4662346/pexels-photo-4662346.jpeg?auto=compress&cs=tinysrgb&w=400",

  // Places
  city: "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=400",
  country:
    "https://images.pexels.com/photos/440731/pexels-photo-440731.jpeg?auto=compress&cs=tinysrgb&w=400",
  world:
    "https://images.pexels.com/photos/87651/earth-blue-planet-globe-planet-87651.jpeg?auto=compress&cs=tinysrgb&w=400",
  earth:
    "https://images.pexels.com/photos/1048039/pexels-photo-1048039.jpeg?auto=compress&cs=tinysrgb&w=400",
  street:
    "https://images.pexels.com/photos/1034662/pexels-photo-1034662.jpeg?auto=compress&cs=tinysrgb&w=400",
  room: "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=400",
  door: "https://images.pexels.com/photos/277559/pexels-photo-277559.jpeg?auto=compress&cs=tinysrgb&w=400",
  place:
    "https://images.pexels.com/photos/1122417/pexels-photo-1122417.jpeg?auto=compress&cs=tinysrgb&w=400",

  // Time
  day: "https://images.pexels.com/photos/1405274/pexels-photo-1405274.jpeg?auto=compress&cs=tinysrgb&w=400",
  night:
    "https://images.pexels.com/photos/531756/pexels-photo-531756.jpeg?auto=compress&cs=tinysrgb&w=400",
  hour: "https://images.pexels.com/photos/1095601/pexels-photo-1095601.jpeg?auto=compress&cs=tinysrgb&w=400",
  time: "https://images.pexels.com/photos/1095601/pexels-photo-1095601.jpeg?auto=compress&cs=tinysrgb&w=400",
  year: "https://images.pexels.com/photos/2098428/pexels-photo-2098428.jpeg?auto=compress&cs=tinysrgb&w=400",
  week: "https://images.pexels.com/photos/273153/pexels-photo-273153.jpeg?auto=compress&cs=tinysrgb&w=400",
  morning:
    "https://images.pexels.com/photos/667838/pexels-photo-667838.jpeg?auto=compress&cs=tinysrgb&w=400",
  evening:
    "https://images.pexels.com/photos/1126384/pexels-photo-1126384.jpeg?auto=compress&cs=tinysrgb&w=400",
  moment:
    "https://images.pexels.com/photos/248021/pexels-photo-248021.jpeg?auto=compress&cs=tinysrgb&w=400",

  // Actions (represented by images of people doing things)
  speak:
    "https://images.pexels.com/photos/7433101/pexels-photo-7433101.jpeg?auto=compress&cs=tinysrgb&w=400",
  walk: "https://images.pexels.com/photos/2253275/pexels-photo-2253275.jpeg?auto=compress&cs=tinysrgb&w=400",
  run: "https://images.pexels.com/photos/235922/pexels-photo-235922.jpeg?auto=compress&cs=tinysrgb&w=400",
  eat: "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=400",
  drink:
    "https://images.pexels.com/photos/3771106/pexels-photo-3771106.jpeg?auto=compress&cs=tinysrgb&w=400",
  sleep:
    "https://images.pexels.com/photos/1028741/pexels-photo-1028741.jpeg?auto=compress&cs=tinysrgb&w=400",
  think:
    "https://images.pexels.com/photos/3808063/pexels-photo-3808063.jpeg?auto=compress&cs=tinysrgb&w=400",
  work: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400",
  read: "https://images.pexels.com/photos/1438077/pexels-photo-1438077.jpeg?auto=compress&cs=tinysrgb&w=400",
  write:
    "https://images.pexels.com/photos/4195342/pexels-photo-4195342.jpeg?auto=compress&cs=tinysrgb&w=400",
  play: "https://images.pexels.com/photos/1912868/pexels-photo-1912868.jpeg?auto=compress&cs=tinysrgb&w=400",
  look: "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400",
  listen:
    "https://images.pexels.com/photos/3756766/pexels-photo-3756766.jpeg?auto=compress&cs=tinysrgb&w=400",
  love: "https://images.pexels.com/photos/984949/pexels-photo-984949.jpeg?auto=compress&cs=tinysrgb&w=400",
  come: "https://images.pexels.com/photos/1683825/pexels-photo-1683825.jpeg?auto=compress&cs=tinysrgb&w=400",
  go: "https://images.pexels.com/photos/775199/pexels-photo-775199.jpeg?auto=compress&cs=tinysrgb&w=400",
  give: "https://images.pexels.com/photos/5691625/pexels-photo-5691625.jpeg?auto=compress&cs=tinysrgb&w=400",
  take: "https://images.pexels.com/photos/3812745/pexels-photo-3812745.jpeg?auto=compress&cs=tinysrgb&w=400",
  want: "https://images.pexels.com/photos/5717628/pexels-photo-5717628.jpeg?auto=compress&cs=tinysrgb&w=400",
  know: "https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=400",
  see: "https://images.pexels.com/photos/5874582/pexels-photo-5874582.jpeg?auto=compress&cs=tinysrgb&w=400",
  find: "https://images.pexels.com/photos/3825539/pexels-photo-3825539.jpeg?auto=compress&cs=tinysrgb&w=400",
  ask: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=400",
  call: "https://images.pexels.com/photos/4050319/pexels-photo-4050319.jpeg?auto=compress&cs=tinysrgb&w=400",
  wait: "https://images.pexels.com/photos/1308748/pexels-photo-1308748.jpeg?auto=compress&cs=tinysrgb&w=400",
  leave:
    "https://images.pexels.com/photos/1683825/pexels-photo-1683825.jpeg?auto=compress&cs=tinysrgb&w=400",
  return:
    "https://images.pexels.com/photos/5393668/pexels-photo-5393668.jpeg?auto=compress&cs=tinysrgb&w=400",
  enter:
    "https://images.pexels.com/photos/783243/pexels-photo-783243.jpeg?auto=compress&cs=tinysrgb&w=400",
  stay: "https://images.pexels.com/photos/161851/living-room-interior-furniture-sofa-161851.jpeg?auto=compress&cs=tinysrgb&w=400",
  open: "https://images.pexels.com/photos/277559/pexels-photo-277559.jpeg?auto=compress&cs=tinysrgb&w=400",
  carry:
    "https://images.pexels.com/photos/3768005/pexels-photo-3768005.jpeg?auto=compress&cs=tinysrgb&w=400",
  fall: "https://images.pexels.com/photos/7350844/pexels-photo-7350844.jpeg?auto=compress&cs=tinysrgb&w=400",
  feel: "https://images.pexels.com/photos/6383260/pexels-photo-6383260.jpeg?auto=compress&cs=tinysrgb&w=400",
  follow:
    "https://images.pexels.com/photos/1650281/pexels-photo-1650281.jpeg?auto=compress&cs=tinysrgb&w=400",
  lose: "https://images.pexels.com/photos/6478886/pexels-photo-6478886.jpeg?auto=compress&cs=tinysrgb&w=400",
  search:
    "https://images.pexels.com/photos/6457544/pexels-photo-6457544.jpeg?auto=compress&cs=tinysrgb&w=400",
  answer:
    "https://images.pexels.com/photos/7092397/pexels-photo-7092397.jpeg?auto=compress&cs=tinysrgb&w=400",
  touch:
    "https://images.pexels.com/photos/6256105/pexels-photo-6256105.jpeg?auto=compress&cs=tinysrgb&w=400",
  hold: "https://images.pexels.com/photos/3768005/pexels-photo-3768005.jpeg?auto=compress&cs=tinysrgb&w=400",
  live: "https://images.pexels.com/photos/3771074/pexels-photo-3771074.jpeg?auto=compress&cs=tinysrgb&w=400",
  die: "https://images.pexels.com/photos/4439444/pexels-photo-4439444.jpeg?auto=compress&cs=tinysrgb&w=400",

  // Abstract concepts need more creative visuals
  life: "https://images.pexels.com/photos/289998/pexels-photo-289998.jpeg?auto=compress&cs=tinysrgb&w=400",
  death:
    "https://images.pexels.com/photos/4439444/pexels-photo-4439444.jpeg?auto=compress&cs=tinysrgb&w=400",
  thing:
    "https://images.pexels.com/photos/3768005/pexels-photo-3768005.jpeg?auto=compress&cs=tinysrgb&w=400",
  name: "https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg?auto=compress&cs=tinysrgb&w=400",
  word: "https://images.pexels.com/photos/256450/pexels-photo-256450.jpeg?auto=compress&cs=tinysrgb&w=400",
  idea: "https://images.pexels.com/photos/355948/pexels-photo-355948.jpeg?auto=compress&cs=tinysrgb&w=400",
  question:
    "https://images.pexels.com/photos/5428003/pexels-photo-5428003.jpeg?auto=compress&cs=tinysrgb&w=400",
  story:
    "https://images.pexels.com/photos/1809340/pexels-photo-1809340.jpeg?auto=compress&cs=tinysrgb&w=400",
  letter:
    "https://images.pexels.com/photos/211291/pexels-photo-211291.jpeg?auto=compress&cs=tinysrgb&w=400",
  problem:
    "https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=400",
  truth:
    "https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg?auto=compress&cs=tinysrgb&w=400",
  reason:
    "https://images.pexels.com/photos/3808063/pexels-photo-3808063.jpeg?auto=compress&cs=tinysrgb&w=400",
  sense:
    "https://images.pexels.com/photos/3861972/pexels-photo-3861972.jpeg?auto=compress&cs=tinysrgb&w=400",
  way: "https://images.pexels.com/photos/163034/road-to-the-future-success-travel-163034.jpeg?auto=compress&cs=tinysrgb&w=400",
  case: "https://images.pexels.com/photos/5668796/pexels-photo-5668796.jpeg?auto=compress&cs=tinysrgb&w=400",
  part: "https://images.pexels.com/photos/5965838/pexels-photo-5965838.jpeg?auto=compress&cs=tinysrgb&w=400",
  point:
    "https://images.pexels.com/photos/2166/lights-party-dancing-colors.jpg?auto=compress&cs=tinysrgb&w=400",
  state:
    "https://images.pexels.com/photos/4386429/pexels-photo-4386429.jpeg?auto=compress&cs=tinysrgb&w=400",
  force:
    "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=400",
  effect:
    "https://images.pexels.com/photos/2569842/pexels-photo-2569842.jpeg?auto=compress&cs=tinysrgb&w=400",
  order:
    "https://images.pexels.com/photos/3243090/pexels-photo-3243090.jpeg?auto=compress&cs=tinysrgb&w=400",
  action:
    "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=400",
  voice:
    "https://images.pexels.com/photos/7433101/pexels-photo-7433101.jpeg?auto=compress&cs=tinysrgb&w=400",
  movement:
    "https://images.pexels.com/photos/1701205/pexels-photo-1701205.jpeg?auto=compress&cs=tinysrgb&w=400",
  form: "https://images.pexels.com/photos/6238165/pexels-photo-6238165.jpeg?auto=compress&cs=tinysrgb&w=400",
  face: "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=400",
  beginning:
    "https://images.pexels.com/photos/667838/pexels-photo-667838.jpeg?auto=compress&cs=tinysrgb&w=400",
  end: "https://images.pexels.com/photos/1126384/pexels-photo-1126384.jpeg?auto=compress&cs=tinysrgb&w=400",
  need: "https://images.pexels.com/photos/5717628/pexels-photo-5717628.jpeg?auto=compress&cs=tinysrgb&w=400",
  interest:
    "https://images.pexels.com/photos/3808063/pexels-photo-3808063.jpeg?auto=compress&cs=tinysrgb&w=400",
  happiness:
    "https://images.pexels.com/photos/1028741/pexels-photo-1028741.jpeg?auto=compress&cs=tinysrgb&w=400",
  soul: "https://images.pexels.com/photos/3608611/pexels-photo-3608611.jpeg?auto=compress&cs=tinysrgb&w=400",
  spirit:
    "https://images.pexels.com/photos/3608611/pexels-photo-3608611.jpeg?auto=compress&cs=tinysrgb&w=400",

  // Adjectives
  big: "https://images.pexels.com/photos/5428003/pexels-photo-5428003.jpeg?auto=compress&cs=tinysrgb&w=400",
  small:
    "https://images.pexels.com/photos/4210372/pexels-photo-4210372.jpeg?auto=compress&cs=tinysrgb&w=400",
  new: "https://images.pexels.com/photos/3184611/pexels-photo-3184611.jpeg?auto=compress&cs=tinysrgb&w=400",
  old: "https://images.pexels.com/photos/3831645/pexels-photo-3831645.jpeg?auto=compress&cs=tinysrgb&w=400",
  good: "https://images.pexels.com/photos/3184416/pexels-photo-3184416.jpeg?auto=compress&cs=tinysrgb&w=400",
  bad: "https://images.pexels.com/photos/6478886/pexels-photo-6478886.jpeg?auto=compress&cs=tinysrgb&w=400",
  long: "https://images.pexels.com/photos/163034/road-to-the-future-success-travel-163034.jpeg?auto=compress&cs=tinysrgb&w=400",
  first:
    "https://images.pexels.com/photos/236982/pexels-photo-236982.jpeg?auto=compress&cs=tinysrgb&w=400",
  last: "https://images.pexels.com/photos/1126384/pexels-photo-1126384.jpeg?auto=compress&cs=tinysrgb&w=400",
  young:
    "https://images.pexels.com/photos/1556704/pexels-photo-1556704.jpeg?auto=compress&cs=tinysrgb&w=400",
  beautiful:
    "https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&w=400",
  white:
    "https://images.pexels.com/photos/3693901/pexels-photo-3693901.jpeg?auto=compress&cs=tinysrgb&w=400",
  black:
    "https://images.pexels.com/photos/3693894/pexels-photo-3693894.jpeg?auto=compress&cs=tinysrgb&w=400",
  alone:
    "https://images.pexels.com/photos/1043473/pexels-photo-1043473.jpeg?auto=compress&cs=tinysrgb&w=400",
  certain:
    "https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg?auto=compress&cs=tinysrgb&w=400",
  true: "https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg?auto=compress&cs=tinysrgb&w=400",
  possible:
    "https://images.pexels.com/photos/355948/pexels-photo-355948.jpeg?auto=compress&cs=tinysrgb&w=400",
  simple:
    "https://images.pexels.com/photos/3693901/pexels-photo-3693901.jpeg?auto=compress&cs=tinysrgb&w=400",
  public:
    "https://images.pexels.com/photos/1267297/pexels-photo-1267297.jpeg?auto=compress&cs=tinysrgb&w=400",
  high: "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=400",
  low: "https://images.pexels.com/photos/2387397/pexels-photo-2387397.jpeg?auto=compress&cs=tinysrgb&w=400",
  natural:
    "https://images.pexels.com/photos/1632790/pexels-photo-1632790.jpeg?auto=compress&cs=tinysrgb&w=400",
  full: "https://images.pexels.com/photos/3693901/pexels-photo-3693901.jpeg?auto=compress&cs=tinysrgb&w=400",
  general:
    "https://images.pexels.com/photos/1267297/pexels-photo-1267297.jpeg?auto=compress&cs=tinysrgb&w=400",
  present:
    "https://images.pexels.com/photos/1309766/pexels-photo-1309766.jpeg?auto=compress&cs=tinysrgb&w=400",
  own: "https://images.pexels.com/photos/3768005/pexels-photo-3768005.jpeg?auto=compress&cs=tinysrgb&w=400",

  // Numbers
  one: "https://images.pexels.com/photos/248021/pexels-photo-248021.jpeg?auto=compress&cs=tinysrgb&w=400",
  two: "https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg?auto=compress&cs=tinysrgb&w=400",
  three:
    "https://images.pexels.com/photos/7148678/pexels-photo-7148678.jpeg?auto=compress&cs=tinysrgb&w=400",
  four: "https://images.pexels.com/photos/7148678/pexels-photo-7148678.jpeg?auto=compress&cs=tinysrgb&w=400",
  five: "https://images.pexels.com/photos/3912994/pexels-photo-3912994.jpeg?auto=compress&cs=tinysrgb&w=400",
  ten: "https://images.pexels.com/photos/3912994/pexels-photo-3912994.jpeg?auto=compress&cs=tinysrgb&w=400",

  // Additional common vocabulary
  air: "https://images.pexels.com/photos/1118873/pexels-photo-1118873.jpeg?auto=compress&cs=tinysrgb&w=400",
  light:
    "https://images.pexels.com/photos/355948/pexels-photo-355948.jpeg?auto=compress&cs=tinysrgb&w=400",
  blood:
    "https://images.pexels.com/photos/1820567/pexels-photo-1820567.jpeg?auto=compress&cs=tinysrgb&w=400",
  nature:
    "https://images.pexels.com/photos/1632790/pexels-photo-1632790.jpeg?auto=compress&cs=tinysrgb&w=400",
  king: "https://images.pexels.com/photos/8111883/pexels-photo-8111883.jpeg?auto=compress&cs=tinysrgb&w=400",
  god: "https://images.pexels.com/photos/3608611/pexels-photo-3608611.jpeg?auto=compress&cs=tinysrgb&w=400",
  society:
    "https://images.pexels.com/photos/1267297/pexels-photo-1267297.jpeg?auto=compress&cs=tinysrgb&w=400",
  government:
    "https://images.pexels.com/photos/4386429/pexels-photo-4386429.jpeg?auto=compress&cs=tinysrgb&w=400",
  war: "https://images.pexels.com/photos/4113117/pexels-photo-4113117.jpeg?auto=compress&cs=tinysrgb&w=400",
  people:
    "https://images.pexels.com/photos/1267297/pexels-photo-1267297.jpeg?auto=compress&cs=tinysrgb&w=400",
  image:
    "https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=400",
  road: "https://images.pexels.com/photos/163034/road-to-the-future-success-travel-163034.jpeg?auto=compress&cs=tinysrgb&w=400",
  piece:
    "https://images.pexels.com/photos/5965838/pexels-photo-5965838.jpeg?auto=compress&cs=tinysrgb&w=400",
  study:
    "https://images.pexels.com/photos/256450/pexels-photo-256450.jpeg?auto=compress&cs=tinysrgb&w=400",
  manner:
    "https://images.pexels.com/photos/5876431/pexels-photo-5876431.jpeg?auto=compress&cs=tinysrgb&w=400",
  report:
    "https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg?auto=compress&cs=tinysrgb&w=400",
  group:
    "https://images.pexels.com/photos/1128318/pexels-photo-1128318.jpeg?auto=compress&cs=tinysrgb&w=400",
  figure:
    "https://images.pexels.com/photos/6238165/pexels-photo-6238165.jpeg?auto=compress&cs=tinysrgb&w=400",
  object:
    "https://images.pexels.com/photos/3768005/pexels-photo-3768005.jpeg?auto=compress&cs=tinysrgb&w=400",
  front:
    "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=400",
  middle:
    "https://images.pexels.com/photos/1122417/pexels-photo-1122417.jpeg?auto=compress&cs=tinysrgb&w=400",
  side: "https://images.pexels.com/photos/1034662/pexels-photo-1034662.jpeg?auto=compress&cs=tinysrgb&w=400",
  cause:
    "https://images.pexels.com/photos/2569842/pexels-photo-2569842.jpeg?auto=compress&cs=tinysrgb&w=400",
  tour: "https://images.pexels.com/photos/1051075/pexels-photo-1051075.jpeg?auto=compress&cs=tinysrgb&w=400",
  politics:
    "https://images.pexels.com/photos/4386429/pexels-photo-4386429.jpeg?auto=compress&cs=tinysrgb&w=400",
  affair:
    "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400",
  pain: "https://images.pexels.com/photos/6478886/pexels-photo-6478886.jpeg?auto=compress&cs=tinysrgb&w=400",
  account:
    "https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg?auto=compress&cs=tinysrgb&w=400",
  right:
    "https://images.pexels.com/photos/163034/road-to-the-future-success-travel-163034.jpeg?auto=compress&cs=tinysrgb&w=400",
  power:
    "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=400",
  french:
    "https://images.pexels.com/photos/1461974/pexels-photo-1461974.jpeg?auto=compress&cs=tinysrgb&w=400",
  better:
    "https://images.pexels.com/photos/3184416/pexels-photo-3184416.jpeg?auto=compress&cs=tinysrgb&w=400",
  sir: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400",
  kind: "https://images.pexels.com/photos/984949/pexels-photo-984949.jpeg?auto=compress&cs=tinysrgb&w=400",
  thought:
    "https://images.pexels.com/photos/3808063/pexels-photo-3808063.jpeg?auto=compress&cs=tinysrgb&w=400",

  throw:
    "https://images.pexels.com/photos/3856433/pexels-photo-3856433.jpeg?auto=compress&cs=tinysrgb&w=400",
  pull: "https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg?auto=compress&cs=tinysrgb&w=400",
  receive:
    "https://images.pexels.com/photos/5691625/pexels-photo-5691625.jpeg?auto=compress&cs=tinysrgb&w=400",
  understand:
    "https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=400",
  believe:
    "https://images.pexels.com/photos/3808063/pexels-photo-3808063.jpeg?auto=compress&cs=tinysrgb&w=400",
  allow:
    "https://images.pexels.com/photos/6256105/pexels-photo-6256105.jpeg?auto=compress&cs=tinysrgb&w=400",
  serve:
    "https://images.pexels.com/photos/4253312/pexels-photo-4253312.jpeg?auto=compress&cs=tinysrgb&w=400",

  // Responses
  yes: "https://images.pexels.com/photos/3184416/pexels-photo-3184416.jpeg?auto=compress&cs=tinysrgb&w=400",
  no: "https://images.pexels.com/photos/6478886/pexels-photo-6478886.jpeg?auto=compress&cs=tinysrgb&w=400",
  maybe:
    "https://images.pexels.com/photos/3808063/pexels-photo-3808063.jpeg?auto=compress&cs=tinysrgb&w=400",
};

/**
 * Get image URL for a word using curated Pexels images
 * Falls back to Picsum Photos for words not in the curated list
 */
export function getImageForWord(keyword: string): ImageSearchResult {
  const normalizedKeyword = keyword.toLowerCase().trim();

  // Check if we have a curated Pexels image
  const pexelsUrl = PEXELS_IMAGES[normalizedKeyword];

  if (pexelsUrl) {
    return {
      imageUrl: pexelsUrl,
      thumbnailUrl: pexelsUrl,
      attribution: {
        photographerName: "Pexels",
        photographerUrl: "https://www.pexels.com",
        source: "Pexels",
        sourceUrl: "https://www.pexels.com",
      },
    };
  }

  // Fallback to Picsum Photos (reliable placeholder service)
  // Use seed based on keyword for consistent images per word
  const seed = normalizedKeyword.charCodeAt(0) * 100 + normalizedKeyword.length;
  const picsumUrl = `${PICSUM_BASE}/seed/${encodeURIComponent(normalizedKeyword)}/400/300`;

  return {
    imageUrl: picsumUrl,
    thumbnailUrl: picsumUrl,
    attribution: {
      photographerName: "Lorem Picsum",
      photographerUrl: "https://picsum.photos",
      source: "Picsum Photos",
      sourceUrl: "https://picsum.photos",
    },
  };
}

/**
 * Get multiple different images for exercise options
 * Ensures variety by using different seeds for Picsum fallback
 */
export function getImagesForWords(keywords: string[]): ImageSearchResult[] {
  return keywords.map((keyword, index) => {
    const result = getImageForWord(keyword);

    // If using Picsum fallback, add index to seed for variety
    if (!PEXELS_IMAGES[keyword.toLowerCase()]) {
      const seed = `${keyword}-${index}`;
      const seededUrl = `${PICSUM_BASE}/seed/${encodeURIComponent(seed)}/400/300`;
      return {
        ...result,
        imageUrl: seededUrl,
        thumbnailUrl: seededUrl,
      };
    }

    return result;
  });
}

/**
 * Preload images for smoother UX
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Don't block on failed loads
        img.src = url;
      });
    }),
  );
}

/**
 * Get placeholder image for loading states
 */
export function getPlaceholderImage(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3Ccircle cx='200' cy='150' r='40' fill='%23e0e0e0'/%3E%3C/svg%3E";
}

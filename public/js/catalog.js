/* Catálogo de perfumes — Créditos S.A.
   Para añadir un perfume nuevo: agrega un objeto al arreglo PRODUCTS
   con category "hombre" o "mujer" y una imagen en public/img/<category>/ */

const PRODUCTS = [
  // ---------------- HOMBRE ----------------
  { slug: "leau-issey-pour-homme", category: "hombre", brand: "Issey Miyake", name: "L'Eau d'Issey Pour Homme", note: "Acuático · Amaderado", img: "img/hombre/leau-issey-pour-homme.jpg" },
  { slug: "allure-homme-sport", category: "hombre", brand: "Chanel", name: "Allure Homme Sport", note: "Cítrico · Fresco", img: "img/hombre/allure-homme-sport.jpg" },
  { slug: "arsenal", category: "hombre", brand: "Gilles Cantuel", name: "Arsenal", note: "Amaderado · Especiado", img: "img/hombre/arsenal.jpg" },
  { slug: "acqua-di-gio", category: "hombre", brand: "Giorgio Armani", name: "Acqua Di Giò", note: "Acuático · Marino", img: "img/hombre/acqua-di-gio.jpg" },
  { slug: "k-by-dolce-gabbana", category: "hombre", brand: "Dolce & Gabbana", name: "K by Dolce&Gabbana", note: "Amaderado · Aromático", img: "img/hombre/k-by-dolce-gabbana.jpg" },
  { slug: "hugo-red", category: "hombre", brand: "Hugo Boss", name: "Hugo Red", note: "Especiado · Frutal", img: "img/hombre/hugo-red.jpg" },
  { slug: "invictus", category: "hombre", brand: "Paco Rabanne", name: "Invictus", note: "Marino · Amaderado", img: "img/hombre/invictus.jpg" },
  { slug: "lacoste-l1212-blanc", category: "hombre", brand: "Lacoste", name: "L.12.12 Blanc", note: "Fresco · Cítrico", img: "img/hombre/lacoste-l1212-blanc.jpg" },
  { slug: "lacoste-l1212-rouge", category: "hombre", brand: "Lacoste", name: "L.12.12 Rouge Energetic", note: "Especiado · Amaderado", img: "img/hombre/lacoste-l1212-rouge.jpg" },
  { slug: "nautica-voyage", category: "hombre", brand: "Nautica", name: "Voyage", note: "Acuático · Ozónico", img: "img/hombre/nautica-voyage.jpg" },
  { slug: "polo-blue", category: "hombre", brand: "Ralph Lauren", name: "Polo Blue", note: "Fresco · Amaderado", img: "img/hombre/polo-blue.jpg" },
  { slug: "versace-eros", category: "hombre", brand: "Versace", name: "Eros", note: "Oriental · Fougère", img: "img/hombre/versace-eros.jpg" },

  // ---------------- MUJER ----------------
  { slug: "212-nyc", category: "mujer", brand: "Carolina Herrera", name: "212 NYC", note: "Floral · Frutal", img: "img/mujer/212-nyc.jpg" },
  { slug: "3-limperatrice", category: "mujer", brand: "Dolce & Gabbana", name: "3 L'Impératrice", note: "Floral · Frutal", img: "img/mujer/3-limperatrice.jpg" },
  { slug: "sweet-like-candy", category: "mujer", brand: "Ariana Grande", name: "Sweet Like Candy", note: "Gourmand · Floral", img: "img/mujer/sweet-like-candy.jpg" },
  { slug: "omnia-amethyste", category: "mujer", brand: "Bvlgari", name: "Omnia Améthyste", note: "Floral · Afrutado", img: "img/mujer/omnia-amethyste.jpg" },
  { slug: "jadore", category: "mujer", brand: "Dior", name: "J'adore", note: "Floral · Elegante", img: "img/mujer/jadore.jpg" },
  { slug: "joy", category: "mujer", brand: "Dior", name: "Joy", note: "Floral · Almizclado", img: "img/mujer/joy.jpg" },
  { slug: "miss-dior", category: "mujer", brand: "Dior", name: "Miss Dior", note: "Floral · Chipre", img: "img/mujer/miss-dior.jpg" },
  { slug: "toy2-bubblegum", category: "mujer", brand: "Moschino", name: "Toy 2 Bubble Gum", note: "Gourmand · Dulce", img: "img/mujer/toy2-bubblegum.jpg" },
  { slug: "paris-hilton", category: "mujer", brand: "Paris Hilton", name: "Paris Hilton", note: "Floral · Afrutado", img: "img/mujer/paris-hilton.jpg" },
  { slug: "bright-crystal", category: "mujer", brand: "Versace", name: "Bright Crystal", note: "Floral · Afrutado", img: "img/mujer/bright-crystal.jpg" },
  { slug: "bombshell", category: "mujer", brand: "Victoria's Secret", name: "Bombshell", note: "Floral · Frutal", img: "img/mujer/bombshell.jpg" },
];

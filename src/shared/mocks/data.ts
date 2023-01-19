import { PastryType } from 'src/pastries/schemas/pastry.schema';

export const MOCK_PASTRIES: {
  name: string;
  type: PastryType;
  imageUrl: string;
  ingredients?: string[];
}[] = [
  {
    name: 'Pourboire',
    type: 'tip',
    imageUrl: 'demo-resto/tip.jpg',
  },
  {
    name: 'Gaufre',
    ingredients: ['sucre', 'farine', 'oeufs', 'lait', 'chocolat'],
    type: 'pastry',
    imageUrl: 'demo-resto/gaufre.jpg',
  },
  {
    name: 'Crêpe',
    ingredients: ['sucre', 'farine', 'oeufs', 'lait', 'chocolat'],
    type: 'pastry',
    imageUrl: 'demo-resto/crepe.jpg',
  },
  {
    name: 'Poké bowl Tofu',
    ingredients: [
      'quinoa',
      'tofu grillé',
      'sauce soja',
      'sésame',
      'piment doux',
      'chou rouge',
      'sésame',
      'edamame',
      'carotte',
    ],
    type: 'pastry',
    imageUrl: 'demo-resto/poke-bowl.jpg',
  },
  {
    name: 'Pita falafel',
    ingredients: [
      'boulettes de pois chiche',
      'sauce tahini',
      'pickles',
      'tomates',
      'persil',
      'oignons',
      'laitue',
    ],
    type: 'pastry',
    imageUrl: 'demo-resto/pita-falafel.jpg',
  },
  {
    name: 'Burger',
    ingredients: [
      'gros champignon de Paname',
      'tomme de montagne au lait cru',
      'tomates séchées',
      'oignons confits',
      'ciboulette',
      'sauce cocktail artisanale',
    ],
    type: 'pastry',
    imageUrl: 'demo-resto/burger.jpg',
  },
  {
    name: 'Frites',
    ingredients: ['pomme de terre'],
    type: 'pastry',
    imageUrl: 'demo-resto/frite.jpg',
  },
  {
    name: 'Citronnade',
    ingredients: ['eau', 'sucre', 'jus de citron', 'menthe'],
    type: 'drink',
    imageUrl: 'demo-resto/citronnade.jpg',
  },
  {
    name: "Jus d'orange",
    ingredients: ["jus d'orange"],
    type: 'drink',
    imageUrl: 'demo-resto/jus-d-orange.jpg',
  },
  {
    name: 'Thé glacé',
    ingredients: ['eau', 'thé noir', 'amande', 'cerise', 'pétales de bleuets'],
    type: 'drink',
    imageUrl: 'demo-resto/the-glace.jpg',
  },
  {
    name: 'Thé',
    ingredients: ['eau', 'thé noir', 'amande', 'cerise', 'pétales de bleuets'],
    type: 'drink',
    imageUrl: 'demo-resto/the.jpg',
  },
];

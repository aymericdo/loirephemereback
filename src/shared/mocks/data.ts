import { PastryType } from 'src/pastries/schemas/pastry.schema';

export const MOCK_PASTRIES: {
  name: string;
  type: PastryType;
  imageUrl: string;
  ingredients?: string[];
  price: number;
  description: string;
}[] = [
  {
    name: '🍽️ Plats',
    ingredients: [],
    type: 'separator',
    imageUrl: '',
    price: 0,
    description: 'Savourez des plats délicieux préparés avec soin. Commandez en quelques clics et régalez-vous !',
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
    price: 13,
    description:
      'Riz vinaigré, carotte râpée, edamame écossé, salade de tomates cerises et oignons cébette, quinoa, radis rose, avocat, grenade, mangue. Mélange herbes, vinaigrette citron-balsamique.',
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
    price: 8,
    description:
      'Falafels de courgette et fromage, légumes cuisinés (aubergine, carotte, courgette, poivrons), préparation du berger (tomate, concombre, poivrons, persil), laitue, chou rouge mariné, quelques grains de grenade et notre sauce signature Berliner',
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
    price: 12,
    description:
      'Végatarien et décadent ! Champignon Portobello, panure de panko, old-fashioned melted cheddar, salade iceberg, sauce secrète.',
  },
  {
    name: 'Frites',
    ingredients: ['pomme de terre'],
    type: 'pastry',
    imageUrl: 'demo-resto/frite.jpg',
    price: 4,
    description:
      'Frites allumettes maison, pommes de terre en agriculture raisonnée',
  },
  {
    name: '🥤 Boissons',
    ingredients: [],
    type: 'separator',
    imageUrl: '',
    price: 0,
    description: 'Rafraîchissez-vous avec notre sélection de boissons. Du soft au cocktail, il y en a pour tous les goûts !',
  },
  {
    name: 'Citronnade',
    ingredients: ['eau', 'sucre', 'jus de citron', 'menthe'],
    type: 'drink',
    imageUrl: 'demo-resto/citronnade.jpg',
    price: 3,
    description: 'Citronnade maison infusée à la menthe. Une vraie fraîcheur !',
  },
  {
    name: "Jus d'orange",
    ingredients: ["jus d'orange"],
    type: 'drink',
    imageUrl: 'demo-resto/jus-d-orange.jpg',
    price: 3,
    description: "Jus d'orange maison, pressé le matin.",
  },
  {
    name: 'Thé glacé',
    ingredients: ['eau', 'thé noir', 'amande', 'cerise', 'pétales de bleuets'],
    type: 'drink',
    imageUrl: 'demo-resto/the-glace.jpg',
    price: 3,
    description: 'Thé glacé bien frais.',
  },
  {
    name: '🍰 Desserts',
    ingredients: [],
    type: 'separator',
    imageUrl: '',
    price: 0,
    description: 'Terminez sur une note sucrée avec nos desserts gourmands. Un pur plaisir à chaque bouchée !',
  },
  {
    name: 'Gaufre',
    ingredients: ['sucre', 'farine', 'oeufs', 'lait', 'chocolat'],
    type: 'pastry',
    imageUrl: 'demo-resto/gaufre.jpg',
    price: 3,
    description: 'Une belle gaufre croustillante.',
  },
  {
    name: 'Crêpe',
    ingredients: ['sucre', 'farine', 'oeufs', 'lait', 'chocolat'],
    type: 'pastry',
    imageUrl: 'demo-resto/crepe.jpg',
    price: 3,
    description:
      "Faite minute ! Laissez vous tenter par la spécialité Caro, galette complète de blé noir (farine Bio) à l'emmental, Fourme d'Ambert, fromage de raclette et salade fraîche.",
  },
  {
    name: '💸 Pourboire',
    ingredients: [],
    type: 'separator',
    imageUrl: '',
    price: 0,
    description: 'Soutenez votre restaurant préféré ! Laissez un petit extra pour remercier l\'équipe.',
  },
  {
    name: 'Pourboire',
    type: 'tip',
    imageUrl: 'demo-resto/tip.jpg',
    price: 1,
    description: "À vot' bon cœur m'sieurs dames !.",
  },
];

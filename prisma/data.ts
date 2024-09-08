import { ProductWithoutId } from "../src/types/product.type";

export const user = [
  {
    phoneNumber: "09362712519",
    isAdmin: true,
  },
];

export const address = [
  {
    address: "ارومیه ، ایثار ، خیابان جمهوری ، مجتمع کلستان",
    street: "رسالت",
    city: "ارومیه",
    zipCode: "1234",
    province: "آذربایجان غربی",
    neighborhood: "جمهوری",
    plate: "آ 7",
    floor: "طبقه 3",
    receiverName: "فرید",
    receiverLastName: "بیغم",
    receiverPhoneNumber: "09362712519",
    isDefault: true,
  },
];

export const category = [{ name: "category-3" }, { name: "category-22" }];

export const color = [
  { title: "red", hexCode: "#FF0000" },
  { title: "white", hexCode: "#fff" },
  { title: "black", hexCode: "#000" },
];

export const badge = [
  { title: "free cargodlar", icon: "icon1" },
  { title: "free", icon: "icon2" },
  { title: "payed", icon: "icon3" },
];

export const productsSeed: ProductWithoutId[] = [
  {
    createdAt: new Date(),
    description: "",
    discount: 42,
    enName: "Aqeleh Saffron Sachet - 4 grams",
    images: [
      "https://res.cloudinary.com/dfflta8zl/image/upload/v1718792363/6EXuJbahUldCn0l-Z0XT9.webp",
    ],
    point: 20,
    price: 840000,
    prName: "زعفران پاکتی عاقله - 4 گرم",
    quantity: 10,
    slug: "aqeleh-saffron-sachet-4-grams",
    updatedAt: new Date(),
    weight: 4,
  },
  {
    createdAt: new Date(),
    description: "",
    discount: 39,
    enName:
      "Aqeleh Gift Saffron - 3 grams with Cardamom - 10 grams Teapot and Mortar",
    images: [
      "https://res.cloudinary.com/dfflta8zl/image/upload/v1718793798/1aN8Hc45n4go4H-LA8oZU.webp",
    ],
    point: 50,
    price: 1731000,
    prName: "زعفران کادویی عاقله - 3 گرم به همراه هل - 10 گرم قوری و هاون",
    quantity: 2,
    slug: "aqeleh-gift-saffron-3-grams-with-cardamom-10-grams-teapot-and-mortar",
    updatedAt: new Date(),
    weight: 3,
  },
  {
    createdAt: new Date(),
    description: "",
    discount: 0,
    enName: "Melli Negin Saffron Grade 1 - 4.608 grams",
    images: [
      "https://res.cloudinary.com/dfflta8zl/image/upload/v1718793950/bPab-HoVehhk92UipcVfm.webp",
    ],
    point: 40,
    price: 665000,
    prName: "زعفران سرگل درجه یک ملل - 4.608 گرم",
    quantity: 20,
    slug: "melli-negin-saffron-grade-1-4.608-grams",
    updatedAt: new Date(),
    weight: 4.61,
  },
];

export const discount = [
  {
    percentage: 15,
    startDate: "2024-05-18 12:20:33.409",
    endDate: "2027-05-18 12:20:33.409",
  },
  {
    percentage: 20,
    startDate: "2024-05-18 12:20:33.409",
    endDate: "2027-05-18 12:20:33.409",
  },
  {
    percentage: 5,
    startDate: "2024-05-18 12:20:33.409",
    endDate: "2027-05-18 12:20:33.409",
  },
  {
    percentage: 10,
    startDate: "2024-05-18 12:20:33.409",
    endDate: "2027-05-18 12:20:33.409",
  },
  {
    percentage: 12,
    startDate: "2024-05-18 12:20:33.409",
    endDate: "2027-05-18 12:20:33.409",
  },
];

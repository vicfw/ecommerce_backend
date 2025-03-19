--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2 (Debian 17.2-1.pgdg120+1)
-- Dumped by pg_dump version 17.2 (Debian 17.2-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

--
-- Name: status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.status AS ENUM (
    'pending',
    'processing',
    'shipped',
    'returned',
    'delivered',
    'cancelled'
);


ALTER TYPE public.status OWNER TO postgres;

--
-- Name: calculate_discount_price(numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_discount_price(price numeric, discount numeric) RETURNS numeric
    LANGUAGE plpgsql
    AS $$ BEGIN RETURN price - (price * discount / 100);
END;
$$;


ALTER FUNCTION public.calculate_discount_price(price numeric, discount numeric) OWNER TO postgres;

--
-- Name: calculate_profit(numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_profit(price numeric, discount numeric) RETURNS numeric
    LANGUAGE plpgsql
    AS $$ BEGIN RETURN (price * discount / 100);
END;
$$;


ALTER FUNCTION public.calculate_profit(price numeric, discount numeric) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    id integer NOT NULL,
    address character varying(255) NOT NULL,
    street character varying(255) NOT NULL,
    city character varying(255) NOT NULL,
    province character varying(255) NOT NULL,
    plate character varying(255) NOT NULL,
    floor character varying(255) NOT NULL,
    "zipCode" character varying(255) NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "receiverName" character varying(255) NOT NULL,
    "receiverLastName" character varying(255) NOT NULL,
    "receiverPhoneNumber" character varying(255) NOT NULL,
    "userId" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- Name: addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.addresses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.addresses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: anonCarts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."anonCarts" (
    id integer NOT NULL,
    price real NOT NULL,
    profit_from_discount integer DEFAULT 0,
    total_discount_percentage integer DEFAULT 0,
    discount_price real DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    delivery_cost_id integer NOT NULL
);


ALTER TABLE public."anonCarts" OWNER TO postgres;

--
-- Name: anonCarts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public."anonCarts" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."anonCarts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: badges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.badges (
    id integer NOT NULL,
    title text NOT NULL,
    icon text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.badges OWNER TO postgres;

--
-- Name: badges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.badges ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.badges_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: badges_to_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.badges_to_products (
    badge_id integer NOT NULL,
    product_id integer NOT NULL
);


ALTER TABLE public.badges_to_products OWNER TO postgres;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    quantity integer NOT NULL,
    item_price real NOT NULL,
    product_id integer NOT NULL,
    cart_id integer,
    anon_cart_id character varying(255)
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.cart_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cart_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: carts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts (
    id integer NOT NULL,
    price real NOT NULL,
    profit_from_discount real DEFAULT 0,
    total_discount_percentage integer DEFAULT 0,
    discount_price real DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    delivery_cost_id integer NOT NULL,
    "userId" integer NOT NULL
);


ALTER TABLE public.carts OWNER TO postgres;

--
-- Name: carts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.carts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.carts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name text NOT NULL,
    image text NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: color_image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.color_image (
    id integer NOT NULL,
    images text[] NOT NULL,
    color_image text NOT NULL,
    "productId" integer NOT NULL
);


ALTER TABLE public.color_image OWNER TO postgres;

--
-- Name: color_image_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.color_image ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.color_image_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: colors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.colors (
    id integer NOT NULL,
    name text NOT NULL,
    image text NOT NULL
);


ALTER TABLE public.colors OWNER TO postgres;

--
-- Name: colors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.colors ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.colors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: delivery_costs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_costs (
    id integer NOT NULL,
    cost real NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.delivery_costs OWNER TO postgres;

--
-- Name: delivery_costs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.delivery_costs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.delivery_costs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    price real NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.order_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer NOT NULL,
    address_id integer NOT NULL,
    total_amount integer NOT NULL,
    profit_from_discount real DEFAULT 0,
    status character varying DEFAULT 'processing'::character varying,
    delivery_amount integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.orders ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    pr_name character varying(255) DEFAULT 'محصول 1'::character varying,
    en_name character varying(255) DEFAULT 'product 1'::character varying,
    slug character varying(255) DEFAULT '1-product-1'::character varying,
    price double precision NOT NULL,
    discount double precision DEFAULT 0,
    weight double precision DEFAULT 0,
    description text,
    quantity integer NOT NULL,
    images text[],
    point integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    "categoryId" integer NOT NULL,
    "brandId" integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.products ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    "phoneNumber" character varying(255) NOT NULL,
    name character varying(255),
    "lastName" character varying(255),
    code character varying(255) DEFAULT '00000'::character varying NOT NULL,
    "codeValidUntil" timestamp without time zone DEFAULT now() NOT NULL,
    "isAdmin" boolean DEFAULT false NOT NULL,
    "createdAtdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    point integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: postgres
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	285547a0c2ead6dafa8c191ca06661f0f3e8afaeb7656ac92442835a4f033f05	1733946908765
4	dd32cff3dd9d3db04ca876d72b52a53b62d7c1f0ca95f7a6c3a9409d30cdc46b	1734174475883
\.


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.addresses (id, address, street, city, province, plate, floor, "zipCode", "isDefault", "receiverName", "receiverLastName", "receiverPhoneNumber", "userId", "createdAt", "updatedAt") FROM stdin;
1	ارومیه،خیابان سعدی،خیابان بوستان،کوی 2،پلاک 22	ارومیه،خیابان سعدی،خیابان بوستان،کوی 2،پلاک 22	تهران	تهران	12	1	5719668588	t	farid	bigham	09362712519	1	2024-12-11 19:58:25.428553	2024-12-11 19:58:25.428553
2	ارومیه ، ایثار ، خیابان جمهوری ، مجتمع کلستان	رسالت	ارومیه	آذربایجان غربی	آ 7	طبقه 3	1234	t	فرید	بیغم	09362712519	5	2024-12-13 08:26:57.82449	2024-12-13 08:26:57.82449
3	ارومیه ، ایثار ، خیابان جمهوری ، مجتمع کلستان	رسالت	ارومیه	آذربایجان شرقی	آ 7	طبقه 3	1234567891	f	فرید	بیغم	09362712519	5	2024-12-22 22:28:11.956675	2024-12-22 22:28:11.956675
\.


--
-- Data for Name: anonCarts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."anonCarts" (id, price, profit_from_discount, total_discount_percentage, discount_price, created_at, updated_at, delivery_cost_id) FROM stdin;
\.


--
-- Data for Name: badges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.badges (id, title, icon, created_at, updated_at) FROM stdin;
3	free cargodlar	icon1	2024-12-13 08:26:57.883474	2024-12-13 08:26:57.883474
4	free	icon2	2024-12-13 08:26:57.942739	2024-12-13 08:26:57.942739
5	payed	icon3	2024-12-13 08:26:57.999001	2024-12-13 08:26:57.999001
\.


--
-- Data for Name: badges_to_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.badges_to_products (badge_id, product_id) FROM stdin;
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, quantity, item_price, product_id, cart_id, anon_cart_id) FROM stdin;
55	1	665000	20	12	\N
56	2	1.33e+06	20	13	\N
89	1	840000	18	13	\N
90	1	840000	18	46	\N
91	1	665000	20	47	\N
93	2	3.462e+06	19	48	\N
92	3	2.52e+06	18	48	\N
94	1	1.731e+06	19	49	\N
95	1	840000	18	50	\N
96	2	1.33e+06	20	51	\N
97	1	840000	18	52	\N
142	2	1.68e+06	18	53	\N
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts (id, price, profit_from_discount, total_discount_percentage, discount_price, created_at, updated_at, delivery_cost_id, "userId") FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, image) FROM stdin;
1	hello	https://res.cloudinary.com/dfflta8zl/image/upload/v1739720643/hiOxglkEYPEU0G5oz6-62.png
\.


--
-- Data for Name: color_image; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.color_image (id, images, color_image, "productId") FROM stdin;
3	{https://res.cloudinary.com/dfflta8zl/image/upload/v1718793798/1aN8Hc45n4go4H-LA8oZU.webp}	https://res.cloudinary.com/dfflta8zl/image/upload/v1740732366/ZyUoUQfUZ3oNPPhUsTPed.png	18
4	{https://res.cloudinary.com/dfflta8zl/image/upload/v1718793798/1aN8Hc45n4go4H-LA8oZU.webp}	https://res.cloudinary.com/dfflta8zl/image/upload/v1740732366/ZyUoUQfUZ3oNPPhUsTPed.png	18
\.


--
-- Data for Name: colors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.colors (id, name, image) FROM stdin;
\.


--
-- Data for Name: delivery_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_costs (id, cost, created_at, updated_at) FROM stdin;
5	65000	2024-12-18 09:29:57.472929	2024-12-18 09:29:57.472929
6	33000	2024-12-23 08:30:51.787472	2024-12-23 08:30:51.787472
7	45000	2024-12-23 08:32:55.770035	2024-12-23 08:32:55.770035
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, quantity, price) FROM stdin;
1	1	20	1	665000
2	2	18	1	840000
3	2	20	2	1.33e+06
4	3	18	1	840000
5	4	20	1	665000
6	5	19	2	3.462e+06
7	5	18	3	2.52e+06
8	6	18	1	840000
9	7	20	2	1.33e+06
10	8	18	1	840000
11	9	18	2	1.68e+06
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, address_id, total_amount, profit_from_discount, status, delivery_amount, created_at, updated_at) FROM stdin;
4	5	2	665000	0	PROCESSING	65000	2024-12-23 07:49:17.766279	2024-12-23 07:49:17.766279
5	5	2	3573420	2.40858e+06	PROCESSING	65000	2024-12-23 07:52:57.625924	2024-12-23 07:52:57.625924
6	5	2	487200	352800	PROCESSING	33000	2024-12-23 08:32:36.573106	2024-12-23 08:32:36.573106
7	5	2	1330000	0	PROCESSING	33000	2024-12-23 08:33:07.750837	2024-12-23 08:33:07.750837
8	5	2	487200	352800	PROCESSING	45000	2024-12-23 08:34:04.733254	2024-12-23 08:34:04.733254
9	5	2	974400	705600	PROCESSING	45000	2025-01-21 09:39:49.128882	2025-01-21 09:39:49.128882
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, pr_name, en_name, slug, price, discount, weight, description, quantity, images, point, created_at, updated_at, "categoryId", "brandId") FROM stdin;
18	زعفران پاکتی عاقله - 4 گرم	Aqeleh Saffron Sachet - 4 grams	aqeleh-saffron-sachet-4-grams	840000	42	4		10	{https://res.cloudinary.com/dfflta8zl/image/upload/v1718792363/6EXuJbahUldCn0l-Z0XT9.webp}	20	2024-12-13 10:58:18.117	2024-12-13 10:58:18.117	1	1
19	زعفران کادویی عاقله - 3 گرم به همراه هل - 10 گرم قوری و هاون	Aqeleh Gift Saffron - 3 grams with Cardamom - 10 grams Teapot and Mortar	aqeleh-gift-saffron-3-grams-with-cardamom-10-grams-teapot-and-mortar	1731000	39	3		2	{https://res.cloudinary.com/dfflta8zl/image/upload/v1718793798/1aN8Hc45n4go4H-LA8oZU.webp}	50	2024-12-13 10:58:18.117	2024-12-13 10:58:18.117	1	1
20	زعفران سرگل درجه یک ملل - 4.608 گرم	Melli Negin Saffron Grade 1 - 4.608 grams	melli-negin-saffron-grade-1-4.608-grams	665000	0	4.61		20	{https://res.cloudinary.com/dfflta8zl/image/upload/v1718793950/bPab-HoVehhk92UipcVfm.webp}	40	2024-12-13 10:58:18.117	2024-12-13 10:58:18.117	1	1
21	ریشه زعفران افراس - 4.608 گرم	ریشه زعفران افراس - 4.608 گرم	ریشه زعفران افراس - 4.608 گرم	47500	29	4.608		0	{https://res.cloudinary.com/dfflta8zl/image/upload/v1734087356/qURV27hZFu8vWi7fhIl3d.webp}	40	2024-12-13 10:58:18.117	2024-12-13 10:58:18.117	1	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, "phoneNumber", name, "lastName", code, "codeValidUntil", "isAdmin", "createdAtdAt", "updatedAt", point) FROM stdin;
6	9362712519	\N	\N	$2b$04$TZITjDYuzUHjRvUuE1Edu.b.8iZd9xJxgZEgRb5z4lHZP8sTECOp.	2025-02-19 10:18:22.539	f	2025-02-19 10:16:22.633067	2025-02-19 10:16:22.633067	0
5	09362712519	farid	bigham	$2b$04$mXjXbFHU1nZYPjjPElVOW.Agx./RvOKcjgE1r9HoPZD6mAcUDeJdW	2025-02-25 21:29:29.224	t	2024-12-13 08:26:57.76354	2024-12-13 08:26:57.76354	0
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 4, true);


--
-- Name: addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.addresses_id_seq', 3, true);


--
-- Name: anonCarts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."anonCarts_id_seq"', 72, true);


--
-- Name: badges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.badges_id_seq', 5, true);


--
-- Name: cart_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cart_items_id_seq', 142, true);


--
-- Name: carts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.carts_id_seq', 53, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 4, true);


--
-- Name: color_image_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.color_image_id_seq', 4, true);


--
-- Name: colors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.colors_id_seq', 1, false);


--
-- Name: delivery_costs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.delivery_costs_id_seq', 7, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 11, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 9, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 21, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: anonCarts anonCarts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."anonCarts"
    ADD CONSTRAINT "anonCarts_pkey" PRIMARY KEY (id);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: badges badges_title_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_title_unique UNIQUE (title);


--
-- Name: badges_to_products badges_to_products_badge_id_product_id_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.badges_to_products
    ADD CONSTRAINT badges_to_products_badge_id_product_id_pk PRIMARY KEY (badge_id, product_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: color_image color_image_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.color_image
    ADD CONSTRAINT color_image_pkey PRIMARY KEY (id);


--
-- Name: colors colors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_pkey PRIMARY KEY (id);


--
-- Name: delivery_costs delivery_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_costs
    ADD CONSTRAINT delivery_costs_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: users users_phoneNumber_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_phoneNumber_unique" UNIQUE ("phoneNumber");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: badges_to_products badges_to_products_badge_id_badges_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.badges_to_products
    ADD CONSTRAINT badges_to_products_badge_id_badges_id_fk FOREIGN KEY (badge_id) REFERENCES public.badges(id);


--
-- Name: badges_to_products badges_to_products_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.badges_to_products
    ADD CONSTRAINT badges_to_products_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- PostgreSQL database dump complete
--


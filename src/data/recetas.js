
/* =========================================================================
   RECETAS FITNESS (por ración). kcal = 4·P + 4·C + 9·G (se calcula, así siempre cuadra)
   objetivos: v = volumen, d = definición, m = mantenimiento
   ========================================================================= */


/* Valores nutricionales de los ingredientes (por 100 g / 100 ml, o por unidad cuando se cuentan en ud, lata, cda…).
   Con esto los macros de cada receta se CALCULAN a partir de las cantidades exactas que verás en la receta. */
export const NUTRI_DB = {
  // [proteína, hidratos, grasas] por 100 g o 100 ml
  'Aceite de oliva': { per100: [0, 0, 91] }, 'Aceite de sésamo': { per100: [0, 0, 91] },
  'Aguacate': { per100: [2, 2, 15] }, 'Arroz (peso en crudo)': { per100: [7, 78, 0.7] }, 'Arroz basmati (peso en crudo)': { per100: [8, 77, 0.9] },
  'Boniato': { per100: [1.6, 20, 0.1] }, 'Brócoli': { per100: [2.8, 4, 0.4] }, 'Calabacín': { per100: [1.2, 2.5, 0.3] },
  'Carne picada de ternera 5%': { per100: [21, 0, 5] }, 'Claras de huevo': { per100: [10.9, 0.7, 0.2] }, 'Copos de avena': { per100: [13, 60, 7] },
  'Crema de cacahuete': { per100: [25, 13, 50] }, 'Edamame': { per100: [11, 8, 5] }, 'Espárragos': { per100: [2.2, 2, 0.2] },
  'Fideos de arroz (peso en crudo)': { per100: [6, 80, 0.6] }, 'Frutos rojos': { per100: [0.8, 8, 0.4] }, 'Gambas peladas': { per100: [18, 0.5, 1] },
  'Garbanzos cocidos': { per100: [7.5, 20, 2.6] }, 'Granola': { per100: [9, 64, 15] }, 'Hummus': { per100: [8, 14, 18] },
  'Judías verdes': { per100: [1.8, 4, 0.2] }, 'Leche de coco light': { per100: [0.7, 3, 6] }, 'Leche semidesnatada': { per100: [3.3, 4.8, 1.6] },
  'Lechuga y tomate': { per100: [1, 3, 0.2] }, 'Lentejas (peso en seco)': { per100: [24, 52, 1.5] }, 'Merluza': { per100: [17, 0, 1] },
  'Mozzarella light': { per100: [24, 1, 10] }, 'Nueces': { per100: [15, 7, 65] }, 'Pan de barra': { per100: [9, 56, 1.5] },
  'Pan integral': { per100: [9, 43, 3.5] }, 'Pasta integral (peso en crudo)': { per100: [13, 66, 2.5] }, 'Patata': { per100: [2, 17, 0.1] },
  'Pavo en lonchas': { per100: [19, 2, 2.5] }, 'Pechuga de pavo (cruda)': { per100: [23, 0, 1.5] }, 'Pechuga de pollo': { per100: [22.5, 0, 1.5] },
  'Pimiento y zanahoria': { per100: [0.9, 6, 0.2] }, 'Piña natural': { per100: [0.5, 12, 0.1] }, 'Proteína whey': { per100: [78, 6, 6] },
  'Queso en lonchas': { per100: [23, 1, 21] }, 'Queso fresco batido 0%': { per100: [8, 4, 0.2] }, 'Queso rallado light': { per100: [30, 1, 10] },
  'Quinoa (peso en crudo)': { per100: [14, 64, 6] }, 'Requesón': { per100: [12, 3.5, 4] }, 'Salmón': { per100: [20, 0, 12] },
  'Salsa de soja': { per100: [8, 8, 0] }, 'Salsa de tomate': { per100: [1.5, 7, 1.5] }, 'Semillas de chía': { per100: [17, 8, 31] },
  'Skyr natural': { per100: [11, 4, 0.2] }, 'Ternera magra': { per100: [21, 0, 4] }, 'Tomate triturado': { per100: [1, 4, 0.2] },
  'Verduras para wok': { per100: [2, 6, 0.3] }, 'Verduras variadas': { per100: [1.5, 6, 0.3] }, 'Yogur griego 0%': { per100: [10, 4, 0.2] },
  'Zanahoria': { per100: [0.9, 7, 0.2] },
  // [proteína, hidratos, grasas] por unidad (ud, lata, diente, cdta, cda, porción, pizca)
  'Ajo': { ud: [0.2, 0.9, 0] }, 'Atún al natural': { ud: [13, 0, 0.7] }, 'Canela': { ud: [0, 1, 0] }, 'Cebolla': { ud: [1.5, 13, 0.2] },
  'Curry en polvo': { ud: [1.2, 3.5, 1] }, 'Huevo': { ud: [7.5, 0.4, 6.3] }, 'Manzana': { ud: [0.5, 25, 0.4] }, 'Miel': { ud: [0, 6, 0] },
  'Pan de pita': { ud: [5.5, 33, 1] }, 'Plátano': { ud: [1.3, 27, 0.4] }, 'Queso light para untar': { ud: [1.5, 0.9, 2.5] },
  'Sal y pimienta': { ud: [0, 0, 0] }, 'Tomate': { ud: [1, 4, 0.2] }, 'Tortilla de trigo grande': { ud: [6, 35, 5] },
  'Tortitas de arroz': { ud: [0.7, 7.3, 0.3] }, 'Wrap integral': { ud: [5, 30, 4] },

  // ---- Ingredientes añadidos con las recetas nuevas (versión 8) ----
  // [proteína, hidratos, grasas] por 100 g o 100 ml (hidratos disponibles, sin fibra; carnes y pescados en crudo)
  'Alubias rojas cocidas': { per100: [8.5, 16, 0.5] }, 'Almendras': { per100: [21, 9.5, 50] }, 'Arroz integral (peso en crudo)': { per100: [7.5, 76, 2.7] },
  'Atún fresco': { per100: [24, 0, 1] }, 'Bacalao': { per100: [18, 0, 0.7] }, 'Cacao puro en polvo': { per100: [20, 13, 13] },
  'Calabaza': { per100: [1, 6.5, 0.1] }, 'Carne picada de pavo': { per100: [20, 0, 7] }, 'Champiñones': { per100: [3.1, 0.5, 0.3] },
  'Coliflor': { per100: [1.9, 3, 0.3] }, 'Cuscús (peso en crudo)': { per100: [12.8, 72, 0.6] }, 'Espinacas': { per100: [2.9, 1.4, 0.4] },
  'Fresas': { per100: [0.7, 6, 0.3] }, 'Guisantes': { per100: [5.4, 9, 0.4] }, 'Jamón serrano': { per100: [30, 0, 10] },
  'Lomo de cerdo': { per100: [21, 0, 6] }, 'Maíz dulce': { per100: [3, 16, 1.2] }, 'Mango': { per100: [0.8, 14, 0.4] },
  'Mostaza': { per100: [6, 5, 4] }, 'Muslo de pollo sin piel': { per100: [19.5, 0, 5.5] }, 'Pan de centeno': { per100: [8.5, 48, 1.7] },
  'Pasta (peso en crudo)': { per100: [12.5, 71, 1.5] }, 'Pepino': { per100: [0.7, 2.5, 0.1] }, 'Pimiento': { per100: [0.9, 4.5, 0.3] },
  'Queso cottage': { per100: [11, 3.4, 4.3] }, 'Queso parmesano': { per100: [35, 0, 26] }, 'Rúcula': { per100: [2.6, 2, 0.7] },
  'Salmón ahumado': { per100: [21, 0, 6] }, 'Solomillo de cerdo': { per100: [21, 0, 3.5] }, 'Tofu firme': { per100: [14, 2, 8] },
  'Tomate cherry': { per100: [0.9, 3.5, 0.2] },
  // por unidad
  'Dátiles': { ud: [0.4, 17, 0] }, 'Especias (pimentón, comino…)': { ud: [0.3, 0.8, 0.3] }, 'Kiwi': { ud: [0.8, 8.5, 0.4] },
  'Lima o limón': { ud: [0.2, 2, 0.1] }, 'Pan de hamburguesa integral': { ud: [7.5, 38, 3.5] }, 'Tortilla de maíz': { ud: [1.5, 11, 0.7] },
};

// Macros de un ingrediente concreto (cantidad q en la unidad u). cda = 15 ml, cdta = 5 ml.
export function ingMacros(n, q, u) {
  const d = NUTRI_DB[n];
  if (!d || q === null || q === undefined || q === '') return [0, 0, 0];
  let f = null;
  if (d.per100 && (u === 'g' || u === 'ml')) f = q / 100;
  else if (d.per100 && u === 'cda') f = (q * 15) / 100;
  else if (d.per100 && u === 'cdta') f = (q * 5) / 100;
  const base = f !== null ? d.per100 : d.ud;
  if (!base) return [0, 0, 0];
  const k = f !== null ? f : q;
  return [base[0] * k, base[1] * k, base[2] * k];
}

// Crea una receta: los macros se CALCULAN con NUTRI_DB a partir de las cantidades
function R(id, nombre, tipo, obj, ing, pasos) {
  let p = 0, c = 0, g = 0;
  ing.forEach((x) => { const m = ingMacros(x[0], x[1], x[2]); p += m[0]; c += m[1]; g += m[2]; });
  return {
    id: 'r_' + id, nombre, tipo,
    objetivos: obj.split('').map((x) => (x === 'v' ? 'volumen' : x === 'd' ? 'definicion' : 'mantenimiento')),
    p: Math.round(p), c: Math.round(c), g: Math.round(g),
    ingredientes: ing.map((x) => ({ n: x[0], q: x[1], u: x[2] })),
    pasos, propia: false,
  };
}

// Todas las recetas de serie: las 31 de siempre + las 29 nuevas de la versión 8
export function mkRecetas() { return mkRecetasOriginales().concat(RECETAS_NUEVAS_V8()); }

export function mkRecetasOriginales() {
  return [
    // ---- Desayunos ----
    R('avena_platano', 'Avena proteica con plátano y canela', 'desayuno', 'vm',
      [['Copos de avena', 60, 'g'], ['Leche semidesnatada', 250, 'ml'], ['Proteína whey', 30, 'g'], ['Plátano', 1, 'ud'], ['Canela', 1, 'cdta']],
      ['Calienta la leche con la avena 3 minutos removiendo.', 'Aparta del fuego y mezcla la proteína con un chorrito de leche fría.', 'Añade el plátano troceado y la canela.']),
    R('tortita_claras', 'Tortitas de claras y avena con frutos rojos', 'desayuno', 'dm',
      [['Claras de huevo', 150, 'g'], ['Copos de avena', 40, 'g'], ['Frutos rojos', 100, 'g'], ['Miel', 1, 'cdta']],
      ['Tritura las claras con la avena hasta obtener una masa fina.', 'Cocina en sartén antiadherente 2 minutos por lado.', 'Sirve con los frutos rojos y la miel.']),
    R('tostada_aguacate', 'Tostadas de aguacate y huevo', 'desayuno', 'vm',
      [['Pan integral', 70, 'g'], ['Aguacate', 70, 'g'], ['Huevo', 2, 'ud'], ['Sal y pimienta', 1, 'pizca']],
      ['Tuesta el pan.', 'Aplasta el aguacate con sal y pimienta y extiéndelo.', 'Cocina los huevos a la plancha y colócalos encima.']),
    R('yogur_granola', 'Yogur griego con granola y manzana', 'desayuno', 'dm',
      [['Yogur griego 0%', 250, 'g'], ['Granola', 30, 'g'], ['Manzana', 1, 'ud']],
      ['Pon el yogur en un bol.', 'Añade la manzana en dados y la granola justo antes de comer.']),
    R('revuelto_pavo', 'Revuelto de huevos y pavo con pan', 'desayuno', 'dm',
      [['Huevo', 2, 'ud'], ['Claras de huevo', 90, 'g'], ['Pavo en lonchas', 60, 'g'], ['Pan integral', 60, 'g']],
      ['Corta el pavo en tiras y dóralo 1 minuto.', 'Añade los huevos y las claras y remueve a fuego medio.', 'Sirve con el pan tostado.']),
    R('batido_cacahuete', 'Batido de plátano, avena y crema de cacahuete', 'desayuno', 'v',
      [['Leche semidesnatada', 300, 'ml'], ['Plátano', 1, 'ud'], ['Copos de avena', 40, 'g'], ['Proteína whey', 30, 'g'], ['Crema de cacahuete', 15, 'g']],
      ['Pon todos los ingredientes en la batidora.', 'Tritura 40 segundos y bebe al momento.']),
    // ---- Comidas ----
    R('arroz_pollo', 'Arroz con pollo y verduras', 'comida', 'dm',
      [['Pechuga de pollo', 150, 'g'], ['Arroz (peso en crudo)', 80, 'g'], ['Pimiento y zanahoria', 100, 'g'], ['Aceite de oliva', 1, 'cda']],
      ['Cuece el arroz 12 minutos.', 'Saltea el pollo en dados con las verduras y el aceite 8 minutos.', 'Mezcla con el arroz y sazona.']),
    R('pasta_atun', 'Pasta integral con atún y tomate', 'comida', 'dm',
      [['Pasta integral (peso en crudo)', 90, 'g'], ['Atún al natural', 2, 'lata'], ['Tomate triturado', 150, 'g'], ['Ajo', 1, 'diente']],
      ['Cuece la pasta.', 'Sofríe el ajo, añade el tomate y cocina 5 minutos.', 'Incorpora el atún escurrido y mezcla con la pasta.']),
    R('pollo_curry', 'Pollo al curry con arroz basmati', 'comida', 'v',
      [['Pechuga de pollo', 180, 'g'], ['Arroz basmati (peso en crudo)', 90, 'g'], ['Leche de coco light', 100, 'ml'], ['Curry en polvo', 1, 'cda'], ['Cebolla', 0.5, 'ud']],
      ['Dora la cebolla y el pollo en dados.', 'Añade el curry y la leche de coco y cocina 10 minutos.', 'Sirve sobre el arroz cocido.']),
    R('bowl_ternera', 'Bowl de ternera, boniato y brócoli', 'comida', 'm',
      [['Ternera magra', 150, 'g'], ['Boniato', 250, 'g'], ['Brócoli', 150, 'g'], ['Aceite de oliva', 1, 'cda']],
      ['Asa el boniato en dados a 200 °C durante 25 minutos.', 'Cuece el brócoli al vapor 6 minutos.', 'Dora la ternera en tiras y monta el bowl.']),
    R('lentejas_huevo', 'Lentejas con verduras y huevo', 'comida', 'd',
      [['Lentejas (peso en seco)', 80, 'g'], ['Verduras variadas', 150, 'g'], ['Huevo', 1, 'ud'], ['Aceite de oliva', 1, 'cdta']],
      ['Cuece las lentejas con las verduras 25 minutos.', 'Cuece el huevo 10 minutos.', 'Sirve las lentejas con el huevo troceado.']),
    R('burrito_pollo', 'Burrito de pollo y arroz', 'comida', 'v',
      [['Tortilla de trigo grande', 1, 'ud'], ['Pechuga de pollo', 130, 'g'], ['Arroz (peso en crudo)', 60, 'g'], ['Queso rallado light', 40, 'g'], ['Salsa de tomate', 50, 'g']],
      ['Cuece el arroz y plancha el pollo en tiras.', 'Rellena la tortilla con el arroz, el pollo, el queso y la salsa.', 'Enrolla y dóralo 1 minuto por lado.']),
    R('salmon_patata', 'Salmón al horno con patata y espárragos', 'comida', 'vm',
      [['Salmón', 150, 'g'], ['Patata', 250, 'g'], ['Espárragos', 100, 'g'], ['Aceite de oliva', 1, 'cdta']],
      ['Corta la patata en rodajas y hornea a 200 °C 15 minutos.', 'Añade el salmón y los espárragos y hornea 12 minutos más.']),
    R('quinoa_pollo', 'Ensalada de quinoa, garbanzos y pollo', 'comida', 'd',
      [['Quinoa (peso en crudo)', 60, 'g'], ['Garbanzos cocidos', 120, 'g'], ['Pechuga de pollo', 120, 'g'], ['Tomate', 1, 'ud'], ['Aceite de oliva', 1, 'cdta']],
      ['Cuece la quinoa 12 minutos y deja enfriar.', 'Plancha el pollo y córtalo.', 'Mezcla todo con el tomate y el aceite.']),
    // ---- Cenas ----
    R('tortilla_ensalada', 'Tortilla de 3 huevos con ensalada y pan', 'cena', 'dm',
      [['Huevo', 3, 'ud'], ['Lechuga y tomate', 150, 'g'], ['Pan integral', 60, 'g'], ['Aceite de oliva', 1, 'cdta']],
      ['Bate los huevos con una pizca de sal.', 'Cuaja la tortilla en sartén con el aceite.', 'Sirve con la ensalada y el pan.']),
    R('merluza_patata', 'Merluza al horno con patata y judías verdes', 'cena', 'd',
      [['Merluza', 200, 'g'], ['Patata', 200, 'g'], ['Judías verdes', 150, 'g'], ['Aceite de oliva', 1, 'cdta']],
      ['Hornea la patata en rodajas 15 minutos a 200 °C.', 'Añade la merluza y las judías y hornea 12 minutos.']),
    R('wok_pavo', 'Wok de pavo y verduras con fideos de arroz', 'cena', 'mv',
      [['Pechuga de pavo (cruda)', 150, 'g'], ['Fideos de arroz (peso en crudo)', 60, 'g'], ['Verduras para wok', 200, 'g'], ['Salsa de soja', 1, 'cda'], ['Aceite de sésamo', 1, 'cdta']],
      ['Cuece los fideos según el envase.', 'Saltea el pavo en tiras y luego las verduras a fuego fuerte.', 'Añade los fideos y la soja y mezcla 1 minuto.']),
    R('hamburguesa_boniato', 'Hamburguesa casera de ternera con boniato', 'cena', 'm',
      [['Carne picada de ternera 5%', 150, 'g'], ['Boniato', 200, 'g'], ['Lechuga y tomate', 100, 'g']],
      ['Forma la hamburguesa con sal y pimienta.', 'Hornea el boniato en gajos 25 minutos a 200 °C.', 'Plancha la hamburguesa 4 minutos por lado y sirve con ensalada.']),
    R('crema_calabacin', 'Crema de calabacín con huevo duro y tostada', 'cena', 'd',
      [['Calabacín', 300, 'g'], ['Huevo', 2, 'ud'], ['Pan integral', 60, 'g'], ['Queso light para untar', 1, 'porción']],
      ['Cuece el calabacín con un poco de agua y tritúralo con el queso.', 'Cuece los huevos 10 minutos.', 'Sirve la crema con el huevo troceado y la tostada.']),
    R('pizza_wrap', 'Pizza de wrap proteica', 'cena', 'm',
      [['Wrap integral', 1, 'ud'], ['Pavo en lonchas', 100, 'g'], ['Mozzarella light', 40, 'g'], ['Tomate triturado', 60, 'g']],
      ['Unta el wrap con el tomate.', 'Añade el pavo y la mozzarella.', 'Hornea 8 minutos a 200 °C hasta que se dore.']),
    // ---- Snacks ----
    R('skyr_nueces', 'Skyr con nueces', 'snack', 'd',
      [['Skyr natural', 200, 'g'], ['Nueces', 15, 'g']],
      ['Pon el skyr en un bol y añade las nueces troceadas.']),
    R('tortitas_pavo', 'Tortitas de arroz con pavo y queso fresco', 'snack', 'd',
      [['Tortitas de arroz', 3, 'ud'], ['Pavo en lonchas', 60, 'g'], ['Queso fresco batido 0%', 60, 'g']],
      ['Unta el queso fresco en las tortitas.', 'Añade una loncha de pavo encima de cada una.']),
    R('batido_proteina', 'Batido de proteína con leche y plátano', 'snack', 'vm',
      [['Proteína whey', 30, 'g'], ['Leche semidesnatada', 300, 'ml'], ['Plátano', 1, 'ud']],
      ['Tritura todo en la batidora hasta que quede cremoso.']),
    R('hummus_pita', 'Hummus con zanahoria y pan de pita', 'snack', 'm',
      [['Hummus', 60, 'g'], ['Zanahoria', 150, 'g'], ['Pan de pita', 1, 'ud']],
      ['Corta la zanahoria en bastones.', 'Tuesta la pita y sírvela con el hummus.']),
    R('barrita_avena', 'Barrita casera de avena y cacahuete', 'snack', 'v',
      [['Copos de avena', 40, 'g'], ['Crema de cacahuete', 20, 'g'], ['Plátano', 1, 'ud'], ['Canela', 1, 'pizca']],
      ['Machaca el plátano y mézclalo con la avena y la crema de cacahuete.', 'Forma una barrita y hornea 15 minutos a 180 °C.']),
    R('requeson_pina', 'Requesón con piña', 'snack', 'd',
      [['Requesón', 200, 'g'], ['Piña natural', 100, 'g']],
      ['Pon el requesón en un bol y añade la piña en trozos.']),
    R('bocata_pavo', 'Bocadillo de pavo y queso', 'snack', 'v',
      [['Pan de barra', 100, 'g'], ['Pavo en lonchas', 80, 'g'], ['Queso en lonchas', 30, 'g'], ['Tomate', 0.5, 'ud']],
      ['Abre el pan y coloca el pavo, el queso y el tomate.', 'Tuéstalo 2 minutos si quieres.']),
    R('tortilla_avena', 'Tortilla de avena y plátano', 'desayuno', 'vm',
      [['Copos de avena', 50, 'g'], ['Plátano', 1, 'ud'], ['Huevo', 2, 'ud'], ['Canela', 1, 'pizca']],
      ['Tritura la avena con el plátano y los huevos.', 'Cuaja la mezcla en sartén antiadherente 3 minutos por lado.', 'Espolvorea la canela.']),
    R('poke_atun', 'Poke bowl de atún y arroz', 'comida', 'dm',
      [['Arroz (peso en crudo)', 70, 'g'], ['Atún al natural', 2, 'lata'], ['Aguacate', 40, 'g'], ['Edamame', 50, 'g'], ['Salsa de soja', 1, 'cda']],
      ['Cuece el arroz y déjalo templar.', 'Monta el bol con el atún, el aguacate en láminas y el edamame.', 'Aliña con la soja.']),
    R('gambas_arroz', 'Salteado de gambas con verduras y arroz', 'cena', 'dm',
      [['Gambas peladas', 200, 'g'], ['Arroz (peso en crudo)', 50, 'g'], ['Verduras para wok', 200, 'g'], ['Ajo', 1, 'diente'], ['Aceite de oliva', 1, 'cdta']],
      ['Cuece el arroz.', 'Saltea el ajo, las verduras y después las gambas 3 minutos.', 'Mezcla con el arroz y sirve.']),
    R('pudin_chia', 'Pudin de chía con proteína', 'snack', 'dm',
      [['Semillas de chía', 25, 'g'], ['Leche semidesnatada', 200, 'ml'], ['Proteína whey', 30, 'g'], ['Frutos rojos', 50, 'g']],
      ['Mezcla la leche con la proteína y la chía.', 'Deja reposar en la nevera 4 horas o toda la noche.', 'Sirve con los frutos rojos.']),
  ];
}

/* ---------- Recetas nuevas de la versión 8 (29) ----------
   Se añaden a las listas guardadas en la migración a la versión 8, solo si no existen ya (por id). */
export function RECETAS_NUEVAS_V8() {
  return [
    // ---- Desayunos (7) ----
    R('porridge_cacao', 'Porridge de cacao y plátano', 'desayuno', 'vm',
      [['Copos de avena', 60, 'g'], ['Leche semidesnatada', 250, 'ml'], ['Proteína whey', 25, 'g'], ['Cacao puro en polvo', 10, 'g'], ['Plátano', 1, 'ud']],
      ['Cuece la avena con la leche 4 minutos a fuego medio, removiendo.', 'Fuera del fuego, añade el cacao y la proteína disuelta en un chorrito de leche fría.', 'Sirve con el plátano en rodajas por encima.']),
    R('tostada_salmon', 'Tostadas de centeno con salmón ahumado y queso fresco', 'desayuno', 'dm',
      [['Pan de centeno', 70, 'g'], ['Queso fresco batido 0%', 60, 'g'], ['Salmón ahumado', 60, 'g'], ['Rúcula', 15, 'g'], ['Lima o limón', 1, 'ud']],
      ['Tuesta el pan de centeno.', 'Unta el queso fresco batido y coloca la rúcula y el salmón.', 'Termina con unas gotas de limón y pimienta.']),
    R('bowl_skyr_mango', 'Bowl de skyr con mango, avena y almendras', 'desayuno', 'dm',
      [['Skyr natural', 250, 'g'], ['Mango', 100, 'g'], ['Copos de avena', 20, 'g'], ['Almendras', 15, 'g']],
      ['Pon el skyr en un bol.', 'Añade el mango en dados, la avena y las almendras troceadas.']),
    R('tortilla_espinacas', 'Tortilla de claras con espinacas y champiñones', 'desayuno', 'dm',
      [['Huevo', 1, 'ud'], ['Claras de huevo', 150, 'g'], ['Espinacas', 60, 'g'], ['Champiñones', 80, 'g'], ['Pan integral', 50, 'g'], ['Aceite de oliva', 1, 'cdta']],
      ['Saltea los champiñones laminados con el aceite 3 minutos y añade las espinacas hasta que se ablanden.', 'Bate el huevo con las claras, viértelo encima y cuaja 2 minutos por lado.', 'Sirve con el pan tostado.']),
    R('overnight_oats', 'Avena nocturna con yogur griego y fresas', 'desayuno', 'vm',
      [['Copos de avena', 50, 'g'], ['Yogur griego 0%', 150, 'g'], ['Leche semidesnatada', 100, 'ml'], ['Semillas de chía', 10, 'g'], ['Fresas', 100, 'g'], ['Miel', 1, 'cdta']],
      ['Mezcla en un tarro la avena, el yogur, la leche, la chía y la miel.', 'Tápalo y déjalo en la nevera toda la noche.', 'Por la mañana añade las fresas troceadas.']),
    R('tortitas_proteicas', 'Tortitas proteicas de avena y plátano', 'desayuno', 'vm',
      [['Copos de avena', 60, 'g'], ['Claras de huevo', 120, 'g'], ['Plátano', 1, 'ud'], ['Proteína whey', 20, 'g'], ['Miel', 1, 'cdta']],
      ['Tritura la avena, las claras, el plátano y la proteína hasta tener una masa lisa.', 'Haz tortitas pequeñas en sartén antiadherente, 1–2 minutos por lado.', 'Sirve con la miel por encima.']),
    R('tostada_tomate_jamon', 'Tostadas con tomate, jamón serrano y huevo', 'desayuno', 'vm',
      [['Pan integral', 80, 'g'], ['Tomate', 1, 'ud'], ['Aceite de oliva', 1, 'cdta'], ['Jamón serrano', 40, 'g'], ['Huevo', 1, 'ud']],
      ['Tuesta el pan y frota o ralla el tomate por encima con el aceite.', 'Cuece el huevo 9 minutos o hazlo a la plancha.', 'Coloca el jamón y el huevo sobre las tostadas.']),
    // ---- Comidas (8) ----
    R('pollo_cuscus', 'Pollo al limón con cuscús y verduras', 'comida', 'dm',
      [['Pechuga de pollo', 160, 'g'], ['Cuscús (peso en crudo)', 70, 'g'], ['Calabacín', 120, 'g'], ['Pimiento', 80, 'g'], ['Lima o limón', 1, 'ud'], ['Aceite de oliva', 1, 'cdta']],
      ['Hidrata el cuscús con el mismo volumen de agua hirviendo, tapa 5 minutos y suéltalo con un tenedor.', 'Saltea el pollo en dados con el aceite y añade el calabacín y el pimiento 6 minutos.', 'Mezcla con el cuscús y aliña con el zumo de limón.']),
    R('ternera_arroz_integral', 'Salteado de ternera con arroz integral y brócoli', 'comida', 'vm',
      [['Ternera magra', 160, 'g'], ['Arroz integral (peso en crudo)', 80, 'g'], ['Brócoli', 150, 'g'], ['Ajo', 1, 'diente'], ['Salsa de soja', 1, 'cda'], ['Aceite de sésamo', 1, 'cdta']],
      ['Cuece el arroz integral unos 30 minutos.', 'Saltea el ajo y la ternera en tiras a fuego fuerte 2 minutos; añade el brócoli y la soja 4 minutos más.', 'Sirve sobre el arroz con el aceite de sésamo.']),
    R('macarrones_pavo', 'Macarrones con boloñesa de pavo', 'comida', 'vm',
      [['Pasta (peso en crudo)', 90, 'g'], ['Carne picada de pavo', 150, 'g'], ['Tomate triturado', 150, 'g'], ['Cebolla', 0.5, 'ud'], ['Queso parmesano', 10, 'g']],
      ['Cuece la pasta según el envase.', 'Dora la cebolla picada y la carne de pavo; añade el tomate y cocina 10 minutos.', 'Mezcla con la pasta y espolvorea el parmesano.']),
    R('chili_pavo', 'Chili de pavo con alubias rojas y arroz', 'comida', 'vm',
      [['Carne picada de pavo', 130, 'g'], ['Alubias rojas cocidas', 120, 'g'], ['Tomate triturado', 120, 'g'], ['Cebolla', 0.5, 'ud'], ['Especias (pimentón, comino…)', 1, 'cdta'], ['Arroz (peso en crudo)', 60, 'g']],
      ['Cuece el arroz.', 'Sofríe la cebolla, añade la carne y las especias y dóralo todo.', 'Incorpora el tomate y las alubias escurridas y cocina 12 minutos. Sirve con el arroz.']),
    R('bacalao_garbanzos', 'Bacalao con garbanzos y espinacas', 'comida', 'dm',
      [['Bacalao', 180, 'g'], ['Garbanzos cocidos', 150, 'g'], ['Espinacas', 100, 'g'], ['Ajo', 2, 'diente'], ['Especias (pimentón, comino…)', 1, 'cdta'], ['Aceite de oliva', 1, 'cdta']],
      ['Dora el ajo laminado con el aceite y añade el pimentón.', 'Incorpora los garbanzos y las espinacas y saltea 3 minutos.', 'Pon el bacalao encima, tapa y cocina 6–8 minutos a fuego suave.']),
    R('solomillo_patata', 'Solomillo de cerdo con patata asada y ensalada', 'comida', 'dm',
      [['Solomillo de cerdo', 170, 'g'], ['Patata', 220, 'g'], ['Lechuga y tomate', 120, 'g'], ['Mostaza', 1, 'cdta'], ['Aceite de oliva', 1, 'cdta']],
      ['Asa la patata en gajos a 200 °C durante 30 minutos.', 'Unta el solomillo con la mostaza y márcalo en la sartén; termínalo 12 minutos en el horno.', 'Sirve en medallones con la patata y la ensalada aliñada con el aceite.']),
    R('ensalada_pasta_atun', 'Ensalada de pasta con atún, maíz y huevo', 'comida', 'vm',
      [['Pasta (peso en crudo)', 80, 'g'], ['Atún al natural', 2, 'lata'], ['Maíz dulce', 50, 'g'], ['Tomate cherry', 100, 'g'], ['Huevo', 1, 'ud'], ['Aceite de oliva', 1, 'cdta']],
      ['Cuece la pasta y el huevo; enfríalos.', 'Mezcla la pasta con el atún, el maíz y los tomates partidos.', 'Añade el huevo en trozos y aliña con el aceite.']),
    R('curry_tofu', 'Curry de tofu y garbanzos con arroz basmati', 'comida', 'm',
      [['Tofu firme', 150, 'g'], ['Garbanzos cocidos', 100, 'g'], ['Leche de coco light', 100, 'ml'], ['Espinacas', 60, 'g'], ['Curry en polvo', 1, 'cda'], ['Arroz basmati (peso en crudo)', 70, 'g']],
      ['Cuece el arroz.', 'Dora el tofu en dados en sartén antiadherente.', 'Añade el curry, la leche de coco, los garbanzos y las espinacas y cocina 8 minutos. Sirve con el arroz.']),
    // ---- Cenas (7) ----
    R('atun_quinoa', 'Atún a la plancha con quinoa, aguacate y pepino', 'cena', 'dm',
      [['Atún fresco', 160, 'g'], ['Quinoa (peso en crudo)', 50, 'g'], ['Aguacate', 40, 'g'], ['Pepino', 80, 'g'], ['Salsa de soja', 1, 'cda']],
      ['Cuece la quinoa 12 minutos y escúrrela.', 'Marca el atún a la plancha 1–2 minutos por lado.', 'Sirve con la quinoa, el aguacate y el pepino en dados y la soja.']),
    R('muslos_calabaza', 'Muslos de pollo al horno con calabaza y patata', 'cena', 'mv',
      [['Muslo de pollo sin piel', 200, 'g'], ['Calabaza', 200, 'g'], ['Patata', 150, 'g'], ['Especias (pimentón, comino…)', 1, 'cdta'], ['Aceite de oliva', 1, 'cdta']],
      ['Corta la calabaza y la patata en trozos y mézclalas con el aceite y las especias.', 'Ponlas en la bandeja con los muslos.', 'Hornea 35–40 minutos a 200 °C, dando la vuelta a mitad.']),
    R('hamburguesa_pavo', 'Hamburguesa de pavo con pan integral y ensalada', 'cena', 'mv',
      [['Carne picada de pavo', 150, 'g'], ['Pan de hamburguesa integral', 1, 'ud'], ['Queso en lonchas', 20, 'g'], ['Lechuga y tomate', 80, 'g'], ['Mostaza', 1, 'cdta']],
      ['Forma la hamburguesa con sal y pimienta.', 'Hazla a la plancha 4–5 minutos por lado y pon el queso encima al final.', 'Monta el pan con la lechuga, el tomate y la mostaza.']),
    R('revuelto_gambas', 'Revuelto de huevos, gambas y espárragos con tostada', 'cena', 'dm',
      [['Huevo', 2, 'ud'], ['Claras de huevo', 100, 'g'], ['Gambas peladas', 100, 'g'], ['Espárragos', 100, 'g'], ['Pan integral', 40, 'g']],
      ['Saltea los espárragos troceados 4 minutos y añade las gambas 1 minuto.', 'Incorpora los huevos y las claras batidos y remueve a fuego suave hasta cuajar.', 'Sirve con el pan tostado.']),
    R('tacos_pollo', 'Tacos de pollo con pimiento y guacamole', 'cena', 'mv',
      [['Tortilla de maíz', 3, 'ud'], ['Pechuga de pollo', 140, 'g'], ['Pimiento', 100, 'g'], ['Cebolla', 0.5, 'ud'], ['Aguacate', 50, 'g'], ['Lima o limón', 1, 'ud']],
      ['Saltea el pollo en tiras con el pimiento y la cebolla 8 minutos.', 'Aplasta el aguacate con el zumo de lima y una pizca de sal.', 'Calienta las tortillas y rellénalas con el pollo y el guacamole.']),
    R('crema_calabaza_pollo', 'Crema de calabaza con pollo desmenuzado', 'cena', 'd',
      [['Calabaza', 300, 'g'], ['Patata', 100, 'g'], ['Queso light para untar', 1, 'porción'], ['Pechuga de pollo', 120, 'g'], ['Aceite de oliva', 1, 'cdta']],
      ['Cuece la calabaza y la patata en poca agua 20 minutos y tritúralas con el queso.', 'Cocina el pollo a la plancha y desmenúzalo.', 'Sirve la crema con el pollo por encima y un hilo de aceite.']),
    R('lomo_coliflor', 'Lomo de cerdo con puré de coliflor y guisantes', 'cena', 'd',
      [['Lomo de cerdo', 160, 'g'], ['Coliflor', 250, 'g'], ['Leche semidesnatada', 50, 'ml'], ['Guisantes', 80, 'g'], ['Aceite de oliva', 1, 'cdta']],
      ['Cuece la coliflor 12 minutos y tritúrala con la leche hasta que quede un puré.', 'Cuece los guisantes 5 minutos.', 'Haz el lomo a la plancha con el aceite y sírvelo con el puré y los guisantes.']),
    // ---- Snacks (7) ----
    R('cottage_fresas', 'Queso cottage con fresas y nueces', 'snack', 'dm',
      [['Queso cottage', 200, 'g'], ['Fresas', 120, 'g'], ['Nueces', 10, 'g']],
      ['Pon el queso cottage en un bol con las fresas troceadas y las nueces.']),
    R('batido_verde', 'Batido de proteína con kiwi y espinacas', 'snack', 'dm',
      [['Proteína whey', 30, 'g'], ['Kiwi', 2, 'ud'], ['Espinacas', 30, 'g'], ['Leche semidesnatada', 250, 'ml']],
      ['Pela los kiwis y tritúralo todo en la batidora hasta que quede fino.']),
    R('bolitas_datil', 'Bolitas energéticas de avena, dátiles y cacahuete (6 bolitas)', 'snack', 'v',
      [['Copos de avena', 40, 'g'], ['Dátiles', 3, 'ud'], ['Crema de cacahuete', 15, 'g'], ['Proteína whey', 15, 'g'], ['Cacao puro en polvo', 5, 'g']],
      ['Tritura los dátiles deshuesados con la avena, la crema de cacahuete, la proteína y el cacao.', 'Forma 6 bolitas y déjalas 30 minutos en la nevera.']),
    R('tortitas_atun', 'Tortitas de arroz con atún y aguacate', 'snack', 'dm',
      [['Tortitas de arroz', 3, 'ud'], ['Atún al natural', 1, 'lata'], ['Aguacate', 30, 'g'], ['Tomate cherry', 60, 'g']],
      ['Aplasta el aguacate y úntalo en las tortitas.', 'Pon el atún escurrido y los tomates en rodajas encima.']),
    R('edamame_limon', 'Edamame con sal y limón', 'snack', 'd',
      [['Edamame', 150, 'g'], ['Lima o limón', 1, 'ud'], ['Sal y pimienta', 1, 'pizca']],
      ['Cuece el edamame 4 minutos en agua con sal.', 'Escúrrelo y aliña con el limón y una pizca de sal.']),
    R('yogur_cacao', 'Yogur griego proteico de cacao con plátano', 'snack', 'vm',
      [['Yogur griego 0%', 200, 'g'], ['Proteína whey', 15, 'g'], ['Cacao puro en polvo', 5, 'g'], ['Plátano', 1, 'ud']],
      ['Mezcla el yogur con la proteína y el cacao hasta que quede cremoso.', 'Añade el plátano en rodajas.']),
    R('sandwich_pollo', 'Sándwich de pollo, queso fresco y rúcula', 'snack', 'vm',
      [['Pan integral', 80, 'g'], ['Pechuga de pollo', 100, 'g'], ['Queso fresco batido 0%', 40, 'g'], ['Rúcula', 20, 'g'], ['Tomate', 0.5, 'ud']],
      ['Haz el pollo a la plancha y córtalo en láminas.', 'Unta el pan con el queso fresco y monta el sándwich con el pollo, la rúcula y el tomate.']),
  ];
}

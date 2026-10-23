
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

export function mkRecetas() {
  const R = (id, nombre, tipo, obj, ing, pasos) => {
    let p = 0, c = 0, g = 0;
    ing.forEach((x) => { const m = ingMacros(x[0], x[1], x[2]); p += m[0]; c += m[1]; g += m[2]; });
    return {
      id: 'r_' + id, nombre, tipo,
      objetivos: obj.split('').map((x) => (x === 'v' ? 'volumen' : x === 'd' ? 'definicion' : 'mantenimiento')),
      p: Math.round(p), c: Math.round(c), g: Math.round(g),
      ingredientes: ing.map((x) => ({ n: x[0], q: x[1], u: x[2] })),
      pasos, propia: false,
    };
  };
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

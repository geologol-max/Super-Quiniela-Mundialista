import { ParleyQuestion } from '../types';

export const WORLD_CUP_TEAMS = [
  "Alemania", "Arabia Saudita", "Argelia", "Argentina", "Australia", "Austria", 
  "Bélgica", "Bosnia y Herzegovina", "Brasil", "Cabo Verde", "Canadá", "Colombia", 
  "Corea del Sur", "Costa de Marfil", "Croacia", "Curazao", "Dinamarca", "Ecuador", 
  "Egipto", "Escocia", "España", "Estados Unidos", "Francia", "Ghana", "Haití", 
  "Inglaterra", "Irak", "Irán", "Japón", "Jordania", "Marruecos", "México", 
  "Noruega", "Nueva Zelanda", "Países Bajos", "Panamá", "Paraguay", "Portugal", 
  "Qatar", "República Checa", "República Democrática del Congo", "Senegal", 
  "Sudáfrica", "Suecia", "Túnez", "Turquía", "Uruguay", "Uzbekistán"
];

export const TEAM_FLAGS: Record<string, string> = {
  "Alemania": "🇩🇪",
  "Arabia Saudita": "🇸🇦",
  "Argelia": "🇩🇿",
  "Argentina": "🇦🇷",
  "Australia": "🇦🇺",
  "Austria": "🇦🇹",
  "Bélgica": "🇧🇪",
  "Bosnia y Herzegovina": "🇧🇦",
  "Brasil": "🇧🇷",
  "Cabo Verde": "🇨🇻",
  "Canadá": "🇨🇦",
  "Colombia": "🇨🇴",
  "Corea del Sur": "🇰🇷",
  "Costa de Marfil": "🇨🇮",
  "Croacia": "🇭🇷",
  "Curazao": "🇨🇼",
  "Dinamarca": "🇩🇰",
  "Ecuador": "🇪🇨",
  "Egipto": "🇪🇬",
  "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "España": "🇪🇸",
  "Estados Unidos": "🇺🇸",
  "Francia": "🇫🇷",
  "Ghana": "🇬🇭",
  "Haití": "🇭🇹",
  "Inglaterra": "🏴%A3%E2%80%9D%E2%80%9C%C3%82%C2%A0", // Fallback flags or simple standard string representations
  "Irak": "🇮🇶",
  "Irán": "🇮🇷",
  "Japón": "🇯🇵",
  "Jordania": "🇯🇴",
  "Marruecos": "🇲🇦",
  "México": "🇲🇽",
  "Noruega": "🇳🇴",
  "Nueva Zelanda": "🇳🇿",
  "Países Bajos": "🇳🇱",
  "Panamá": "🇵🇦",
  "Paraguay": "🇵🇾",
  "Portugal": "🇵🇹",
  "Qatar": "🇶🇦",
  "República Checa": "🇨🇿",
  "República Democrática del Congo": "🇨🇩",
  "Senegal": "🇸🇳",
  "Sudáfrica": "🇿🇦",
  "Suecia": "🇸🇪",
  "Suiza": "🇨🇭",
  "Túnez": "🇹🇳",
  "Turquía": "🇹🇷",
  "Uruguay": "🇺🇾",
  "Uzbekistán": "🇺🇿"
};

// Fix standard emoji flags for England and Scotland since TS might escape them
TEAM_FLAGS["Inglaterra"] = "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
TEAM_FLAGS["Escocia"] = "🏴󠁧󠁢󠁳󠁣󠁴󠁿";

export const PARLEY_SEEDS: Omit<ParleyQuestion, 'correctAnswer'>[] = [
  { id: 'favorite_team', question: '1) Equipo Favorito (Selección Mundial 2026)', options: WORLD_CUP_TEAMS, points: 10, type: 'select' },
  { id: 'top_scorer', question: '2) Goleador del Mundial (Nombre del Jugador)', options: [], points: 10, type: 'text' },
  { id: 'top_scorer_goals', question: '3) Cantidad de Goles del Goleador del Mundial', options: [], points: 10, type: 'number' },
  { id: 'total_goals', question: '4) Cantidad de Goles Anotados en el Mundial', options: [], points: 10, type: 'number' },
  { id: 'yellow_cards', question: '5) Cantidad de Tarjetas Amarillas', options: [], points: 10, type: 'number' },
  { id: 'red_cards', question: '6) Cantidad de Tarjetas Rojas', options: [], points: 10, type: 'number' },
  { id: 'penalty_goals', question: '7) Cantidad de Goles de Penales (Solo en Fase de Grupos)', options: [], points: 10, type: 'number' },
  { id: 'freekick_goals', question: '8) Cantidad de Goles de Tiro Libre', options: [], points: 10, type: 'number' }
];

// 72 Group stage matches representing 48 teams in 12 groups of 4 teams
export const OFFICIAL_2026_MATCHES_SEED = [
  // Grupo A
  { teamA: 'México', teamB: 'Sudáfrica', group: 'Grupo A', date: '2026-06-11T20:00:00Z', status: 'scheduled' },
  { teamA: 'Corea del Sur', teamB: 'República Checa', group: 'Grupo A', date: '2026-06-12T13:00:00Z', status: 'scheduled' },
  { teamA: 'República Checa', teamB: 'Sudáfrica', group: 'Grupo A', date: '2026-06-16T15:00:00Z', status: 'scheduled' },
  { teamA: 'México', teamB: 'Corea del Sur', group: 'Grupo A', date: '2026-06-16T19:00:00Z', status: 'scheduled' },
  { teamA: 'República Checa', teamB: 'México', group: 'Grupo A', date: '2026-06-20T21:00:00Z', status: 'scheduled' },
  { teamA: 'Sudáfrica', teamB: 'Corea del Sur', group: 'Grupo A', date: '2026-06-20T21:00:00Z', status: 'scheduled' },

  // Grupo B
  { teamA: 'Canadá', teamB: 'Bosnia y Herzegovina', group: 'Grupo B', date: '2026-06-12T16:00:00Z', status: 'scheduled' },
  { teamA: 'Qatar', teamB: 'Suiza', group: 'Grupo B', date: '2026-06-12T19:00:00Z', status: 'scheduled' },
  { teamA: 'Bosnia y Herzegovina', teamB: 'Qatar', group: 'Grupo B', date: '2026-06-17T13:00:00Z', status: 'scheduled' },
  { teamA: 'Canadá', teamB: 'Suiza', group: 'Grupo B', date: '2026-06-17T17:00:00Z', status: 'scheduled' },
  { teamA: 'Bosnia y Herzegovina', teamB: 'Suiza', group: 'Grupo B', date: '2026-06-21T18:00:00Z', status: 'scheduled' },
  { teamA: 'Canadá', teamB: 'Qatar', group: 'Grupo B', date: '2026-06-21T18:00:00Z', status: 'scheduled' },

  // Grupo C
  { teamA: 'Brasil', teamB: 'Marruecos', group: 'Grupo C', date: '2026-06-13T13:00:00Z', status: 'scheduled' },
  { teamA: 'Haití', teamB: 'Escocia', group: 'Grupo C', date: '2026-06-13T16:00:00Z', status: 'scheduled' },
  { teamA: 'Marruecos', teamB: 'Haití', group: 'Grupo C', date: '2026-06-18T15:00:00Z', status: 'scheduled' },
  { teamA: 'Brasil', teamB: 'Escocia', group: 'Grupo C', date: '2026-06-18T19:00:00Z', status: 'scheduled' },
  { teamA: 'Marruecos', teamB: 'Escocia', group: 'Grupo C', date: '2026-06-22T21:00:00Z', status: 'scheduled' },
  { teamA: 'Brasil', teamB: 'Haití', group: 'Grupo C', date: '2026-06-22T21:00:00Z', status: 'scheduled' },

  // Grupo D
  { teamA: 'Estados Unidos', teamB: 'Paraguay', group: 'Grupo D', date: '2026-06-12T22:00:00Z', status: 'scheduled' },
  { teamA: 'Australia', teamB: 'Turquía', group: 'Grupo D', date: '2026-06-13T19:00:00Z', status: 'scheduled' },
  { teamA: 'Paraguay', teamB: 'Australia', group: 'Grupo D', date: '2026-06-18T13:00:00Z', status: 'scheduled' },
  { teamA: 'Estados Unidos', teamB: 'Turquía', group: 'Grupo D', date: '2026-06-18T17:00:00Z', status: 'scheduled' },
  { teamA: 'Estados Unidos', teamB: 'Australia', group: 'Grupo D', date: '2026-06-22T18:00:00Z', status: 'scheduled' },
  { teamA: 'Paraguay', teamB: 'Turquía', group: 'Grupo D', date: '2026-06-22T18:00:00Z', status: 'scheduled' },

  // Grupo E
  { teamA: 'Alemania', teamB: 'Ecuador', group: 'Grupo E', date: '2026-06-14T13:00:00Z', status: 'scheduled' },
  { teamA: 'Costa de Marfil', teamB: 'Curazao', group: 'Grupo E', date: '2026-06-14T16:00:00Z', status: 'scheduled' },
  { teamA: 'Ecuador', teamB: 'Costa de Marfil', group: 'Grupo E', date: '2026-06-19T15:00:00Z', status: 'scheduled' },
  { teamA: 'Alemania', teamB: 'Curazao', group: 'Grupo E', date: '2026-06-19T19:00:00Z', status: 'scheduled' },
  { teamA: 'Ecuador', teamB: 'Curazao', group: 'Grupo E', date: '2026-06-23T21:00:00Z', status: 'scheduled' },
  { teamA: 'Alemania', teamB: 'Costa de Marfil', group: 'Grupo E', date: '2026-06-23T21:00:00Z', status: 'scheduled' },

  // Grupo F
  { teamA: 'Países Bajos', teamB: 'Japón', group: 'Grupo F', date: '2026-06-14T19:00:00Z', status: 'scheduled' },
  { teamA: 'Túnez', teamB: 'Suecia', group: 'Grupo F', date: '2026-06-15T13:00:00Z', status: 'scheduled' },
  { teamA: 'Japón', teamB: 'Túnez', group: 'Grupo F', date: '2026-06-20T13:00:00Z', status: 'scheduled' },
  { teamA: 'Países Bajos', teamB: 'Suecia', group: 'Grupo F', date: '2026-06-20T17:00:00Z', status: 'scheduled' },
  { teamA: 'Países Bajos', teamB: 'Túnez', group: 'Grupo F', date: '2026-06-24T18:00:00Z', status: 'scheduled' },
  { teamA: 'Japón', teamB: 'Suecia', group: 'Grupo F', date: '2026-06-24T18:00:00Z', status: 'scheduled' },

  // Grupo G
  { teamA: 'Bélgica', teamB: 'Egipto', group: 'Grupo G', date: '2026-06-15T16:00:00Z', status: 'scheduled' },
  { teamA: 'Irán', teamB: 'Nueva Zelanda', group: 'Grupo G', date: '2026-06-15T19:00:00Z', status: 'scheduled' },
  { teamA: 'Egipto', teamB: 'Irán', group: 'Grupo G', date: '2026-06-21T15:00:00Z', status: 'scheduled' },
  { teamA: 'Bélgica', teamB: 'Nueva Zelanda', group: 'Grupo G', date: '2026-06-21T19:00:00Z', status: 'scheduled' },
  { teamA: 'Egipto', teamB: 'Nueva Zelanda', group: 'Grupo G', date: '2026-06-25T21:00:00Z', status: 'scheduled' },
  { teamA: 'Bélgica', teamB: 'Irán', group: 'Grupo G', date: '2026-06-25T21:00:00Z', status: 'scheduled' },

  // Grupo H
  { teamA: 'España', teamB: 'Cabo Verde', group: 'Grupo H', date: '2026-06-16T13:00:00Z', status: 'scheduled' },
  { teamA: 'Arabia Saudita', teamB: 'Uruguay', group: 'Grupo H', date: '2026-06-16T16:00:00Z', status: 'scheduled' },
  { teamA: 'Cabo Verde', teamB: 'Arabia Saudita', group: 'Grupo H', date: '2026-06-22T13:00:00Z', status: 'scheduled' },
  { teamA: 'España', teamB: 'Uruguay', group: 'Grupo H', date: '2026-06-22T17:00:00Z', status: 'scheduled' },
  { teamA: 'Cabo Verde', teamB: 'Uruguay', group: 'Grupo H', date: '2026-06-26T18:00:00Z', status: 'scheduled' },
  { teamA: 'España', teamB: 'Arabia Saudita', group: 'Grupo H', date: '2026-06-26T18:00:00Z', status: 'scheduled' },

  // Grupo I
  { teamA: 'Francia', teamB: 'Senegal', group: 'Grupo I', date: '2026-06-17T13:00:00Z', status: 'scheduled' },
  { teamA: 'Irak', teamB: 'Noruega', group: 'Grupo I', date: '2026-06-17T16:00:00Z', status: 'scheduled' },
  { teamA: 'Senegal', teamB: 'Irak', group: 'Grupo I', date: '2026-06-23T13:00:00Z', status: 'scheduled' },
  { teamA: 'Francia', teamB: 'Noruega', group: 'Grupo I', date: '2026-06-23T17:00:00Z', status: 'scheduled' },
  { teamA: 'Francia', teamB: 'Irak', group: 'Grupo I', date: '2026-06-27T21:00:00Z', status: 'scheduled' },
  { teamA: 'Senegal', teamB: 'Noruega', group: 'Grupo I', date: '2026-06-27T21:00:00Z', status: 'scheduled' },

  // Grupo J
  { teamA: 'Argentina', teamB: 'Argelia', group: 'Grupo J', date: '2026-06-15T22:00:00Z', status: 'scheduled' },
  { teamA: 'Austria', teamB: 'Jordania', group: 'Grupo J', date: '2026-06-16T19:00:00Z', status: 'scheduled' },
  { teamA: 'Argelia', teamB: 'Austria', group: 'Grupo J', date: '2026-06-21T13:00:00Z', status: 'scheduled' },
  { teamA: 'Argentina', teamB: 'Jordania', group: 'Grupo J', date: '2026-06-21T17:00:00Z', status: 'scheduled' },
  { teamA: 'Argentina', teamB: 'Austria', group: 'Grupo J', date: '2026-06-25T18:00:00Z', status: 'scheduled' },
  { teamA: 'Argelia', teamB: 'Jordania', group: 'Grupo J', date: '2026-06-25T18:00:00Z', status: 'scheduled' },

  // Grupo K
  { teamA: 'Portugal', teamB: 'República Democrática del Congo', group: 'Grupo K', date: '2026-06-18T13:00:00Z', status: 'scheduled' },
  { teamA: 'Uzbekistán', teamB: 'Colombia', group: 'Grupo K', date: '2026-06-18T16:00:00Z', status: 'scheduled' },
  { teamA: 'República Democrática del Congo', teamB: 'Uzbekistán', group: 'Grupo K', date: '2026-06-24T13:00:00Z', status: 'scheduled' },
  { teamA: 'Portugal', teamB: 'Colombia', group: 'Grupo K', date: '2026-06-24T17:00:00Z', status: 'scheduled' },
  { teamA: 'Portugal', teamB: 'Uzbekistán', group: 'Grupo K', date: '2026-06-28T18:00:00Z', status: 'scheduled' },
  { teamA: 'República Democrática del Congo', teamB: 'Colombia', group: 'Grupo K', date: '2026-06-28T18:00:00Z', status: 'scheduled' },

  // Grupo L
  { teamA: 'Inglaterra', teamB: 'Croacia', group: 'Grupo L', date: '2026-06-19T13:00:00Z', status: 'scheduled' },
  { teamA: 'Ghana', teamB: 'Panamá', group: 'Grupo L', date: '2026-06-19T16:00:00Z', status: 'scheduled' },
  { teamA: 'Croacia', teamB: 'Ghana', group: 'Grupo L', date: '2026-06-25T13:00:00Z', status: 'scheduled' },
  { teamA: 'Inglaterra', teamB: 'Panamá', group: 'Grupo L', date: '2026-06-25T17:00:00Z', status: 'scheduled' },
  { teamA: 'Inglaterra', teamB: 'Ghana', group: 'Grupo L', date: '2026-06-29T21:00:00Z', status: 'scheduled' },
  { teamA: 'Croacia', teamB: 'Panamá', group: 'Grupo L', date: '2026-06-29T21:00:00Z', status: 'scheduled' }
];

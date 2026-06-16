export const teams = [
  { id: 1, name: "Nexus FC",        played: 14, won: 10, drawn: 2, lost: 2,  gf: 38, ga: 15, gd: 23,  points: 32 },
  { id: 2, name: "Phantom United",  played: 14, won: 9,  drawn: 3, lost: 2,  gf: 31, ga: 18, gd: 13,  points: 30 },
  { id: 3, name: "Storm City",      played: 14, won: 8,  drawn: 2, lost: 4,  gf: 27, ga: 21, gd: 6,   points: 26 },
  { id: 4, name: "Apex Athletic",   played: 14, won: 7,  drawn: 3, lost: 4,  gf: 24, ga: 19, gd: 5,   points: 24 },
  { id: 5, name: "Volt FC",         played: 14, won: 6,  drawn: 2, lost: 6,  gf: 22, ga: 24, gd: -2,  points: 20 },
  { id: 6, name: "Surge Sports",    played: 14, won: 5,  drawn: 3, lost: 6,  gf: 19, ga: 26, gd: -7,  points: 18 },
  { id: 7, name: "Blaze FC",        played: 14, won: 3,  drawn: 2, lost: 9,  gf: 14, ga: 31, gd: -17, points: 11 },
  { id: 8, name: "Alpha United",    played: 14, won: 1,  drawn: 1, lost: 12, gf: 9,  ga: 38, gd: -29, points: 4  },
]

export const players = [
  {
    id: 1, name: "Arjun Sharma",   alias: "Blaze",    team: "Nexus FC",
    grade: "S",  auctionPrice: 250, marketValue: 295, bdrPoints: 2840,
    form: ["W","W","W","D","W"],
    record: { wins:{S:5,  "A+":4, A:3, B:0, C:0}, draws:{S:0,"A+":0,A:0,B:0,C:0}, losses:{S:0,"A+":0,A:0,B:2,C:0} },
  },
  {
    id: 2, name: "Rahul Menon",    alias: "Phantom",  team: "Phantom United",
    grade: "A+", auctionPrice: 200, marketValue: 270, bdrPoints: 2330,
    form: ["W","W","D","W","L"],
    record: { wins:{S:2,"A+":4,A:4,B:2,C:0}, draws:{S:0,"A+":0,A:0,B:0,C:0}, losses:{S:0,"A+":0,A:0,B:1,C:1} },
  },
  {
    id: 3, name: "Vikram Nair",    alias: "Storm",    team: "Storm City",
    grade: "A+", auctionPrice: 185, marketValue: 250, bdrPoints: 1980,
    form: ["W","D","W","W","L"],
    record: { wins:{S:1,"A+":4,A:4,B:3,C:0}, draws:{S:0,"A+":1,A:0,B:0,C:0}, losses:{S:0,"A+":0,A:1,B:0,C:1} },
  },
  {
    id: 4, name: "Kiran Reddy",    alias: "Apex",     team: "Apex Athletic",
    grade: "A",  auctionPrice: 160, marketValue: 215, bdrPoints: 1740,
    form: ["W","W","L","W","D"],
    record: { wins:{S:0,"A+":2,A:5,B:4,C:1}, draws:{S:0,"A+":0,A:1,B:0,C:0}, losses:{S:0,"A+":1,A:1,B:0,C:0} },
  },
  {
    id: 5, name: "Suresh Kumar",   alias: "Volt",     team: "Volt FC",
    grade: "A",  auctionPrice: 140, marketValue: 200, bdrPoints: 1540,
    form: ["L","W","W","D","W"],
    record: { wins:{S:0,"A+":1,A:5,B:4,C:2}, draws:{S:0,"A+":0,A:0,B:1,C:0}, losses:{S:0,"A+":0,A:1,B:1,C:0} },
  },
  {
    id: 6, name: "Deepak Pillai",  alias: "Surge",    team: "Surge Sports",
    grade: "B",  auctionPrice: 110, marketValue: 165, bdrPoints: 1280,
    form: ["W","L","D","W","W"],
    record: { wins:{S:0,"A+":0,A:3,B:5,C:4}, draws:{S:0,"A+":0,A:0,B:1,C:0}, losses:{S:0,"A+":0,A:1,B:2,C:0} },
  },
  {
    id: 7, name: "Anil Krishnan",  alias: "Blaze7",   team: "Blaze FC",
    grade: "B",  auctionPrice: 90,  marketValue: 140, bdrPoints: 1080,
    form: ["L","W","L","D","W"],
    record: { wins:{S:0,"A+":0,A:1,B:5,C:5}, draws:{S:0,"A+":0,A:0,B:1,C:0}, losses:{S:0,"A+":0,A:1,B:2,C:2} },
  },
  {
    id: 8, name: "Pradeep Singh",  alias: "Alpha8",   team: "Alpha United",
    grade: "C",  auctionPrice: 60,  marketValue: 90,  bdrPoints: 720,
    form: ["L","L","W","L","D"],
    record: { wins:{S:0,"A+":0,A:0,B:2,C:7}, draws:{S:0,"A+":0,A:0,B:0,C:1}, losses:{S:0,"A+":0,A:0,B:3,C:3} },
  },
]

export const recentFixtures = [
  { id: 1, home: "Nexus FC",       homeScore: 3, away: "Blaze FC",       awayScore: 1, date: "Jun 14" },
  { id: 2, home: "Phantom United", homeScore: 2, away: "Storm City",     awayScore: 2, date: "Jun 14" },
  { id: 3, home: "Apex Athletic",  homeScore: 1, away: "Volt FC",        awayScore: 0, date: "Jun 13" },
  { id: 4, home: "Surge Sports",   homeScore: 2, away: "Alpha United",   awayScore: 1, date: "Jun 13" },
  { id: 5, home: "Storm City",     homeScore: 3, away: "Nexus FC",       awayScore: 3, date: "Jun 12" },
]

export const leagueInfo = {
  name: "Tamil Esports League",
  season: "Season 1 · 2024–25",
  totalRounds: 14,
  currentRound: 14,
}

// ── Team dashboard data (Nexus FC = logged-in team) ──────────────────────────

export const myTeamId = 1

export const myTeamPlayers = [
  {
    id: 1, name: "Arjun Sharma",  alias: "Blaze",   grade: "S",
    auctionPrice: 250, marketValue: 295, bdrPoints: 2840,
    form: ["W","W","W","D","W"],
    record: { wins:{S:5,"A+":4,A:3,B:0,C:0}, draws:{S:0,"A+":0,A:0,B:0,C:0}, losses:{S:0,"A+":0,A:0,B:2,C:0} },
  },
  {
    id: 9, name: "Rohan Das",     alias: "Raptor",  grade: "A",
    auctionPrice: 150, marketValue: 190, bdrPoints: 1420,
    form: ["W","L","W","W","D"],
    record: { wins:{S:0,"A+":1,A:5,B:3,C:2}, draws:{S:0,"A+":0,A:0,B:0,C:1}, losses:{S:0,"A+":0,A:1,B:1,C:0} },
  },
  {
    id: 10, name: "Siddharth Roy", alias: "Sid",   grade: "B",
    auctionPrice: 100, marketValue: 140, bdrPoints: 1060,
    form: ["D","W","L","W","W"],
    record: { wins:{S:0,"A+":0,A:2,B:5,C:4}, draws:{S:0,"A+":0,A:0,B:1,C:0}, losses:{S:0,"A+":0,A:0,B:2,C:1} },
  },
  {
    id: 11, name: "Manish Iyer",   alias: "Mani",  grade: "C",
    auctionPrice: 55,  marketValue: 80,  bdrPoints: 560,
    form: ["L","W","L","D","W"],
    record: { wins:{S:0,"A+":0,A:0,B:1,C:6}, draws:{S:0,"A+":0,A:0,B:0,C:1}, losses:{S:0,"A+":0,A:0,B:1,C:4} },
  },
]

export const allFixtures = [
  // Past
  { id:1,  home:"Nexus FC",       homeScore:3, away:"Blaze FC",       awayScore:1, date:"Jun 14", round:14, status:"completed" },
  { id:2,  home:"Phantom United", homeScore:2, away:"Storm City",     awayScore:2, date:"Jun 14", round:14, status:"completed" },
  { id:3,  home:"Nexus FC",       homeScore:3, away:"Storm City",     awayScore:3, date:"Jun 12", round:13, status:"completed" },
  { id:4,  home:"Volt FC",        homeScore:0, away:"Nexus FC",       awayScore:2, date:"Jun 10", round:12, status:"completed" },
  { id:5,  home:"Nexus FC",       homeScore:4, away:"Alpha United",   awayScore:0, date:"Jun 7",  round:11, status:"completed" },
  { id:6,  home:"Surge Sports",   homeScore:1, away:"Nexus FC",       awayScore:2, date:"Jun 5",  round:10, status:"completed" },
  // Upcoming
  { id:7,  home:"Nexus FC",       homeScore:null, away:"Apex Athletic",   awayScore:null, date:"Jun 18", round:15, status:"upcoming" },
  { id:8,  home:"Phantom United", homeScore:null, away:"Nexus FC",        awayScore:null, date:"Jun 22", round:16, status:"upcoming" },
  { id:9,  home:"Nexus FC",       homeScore:null, away:"Storm City",      awayScore:null, date:"Jun 26", round:17, status:"upcoming" },
]

export const tradeRequests = [
  { id:1, direction:"sent",     playerName:"Rahul Menon",   playerGrade:"A+", fromTeam:"Nexus FC",       toTeam:"Phantom United", status:"pending",  requestedOn:"Jun 13" },
  { id:2, direction:"received", playerName:"Arjun Sharma",  playerGrade:"S",  fromTeam:"Storm City",     toTeam:"Nexus FC",       status:"pending",  requestedOn:"Jun 12" },
  { id:3, direction:"sent",     playerName:"Vikram Nair",   playerGrade:"A+", fromTeam:"Nexus FC",       toTeam:"Storm City",     status:"rejected", requestedOn:"Jun 10" },
  { id:4, direction:"received", playerName:"Siddharth Roy", playerGrade:"B",  fromTeam:"Apex Athletic",  toTeam:"Nexus FC",       status:"pending",  requestedOn:"Jun 9"  },
  { id:5, direction:"sent",     playerName:"Kiran Reddy",   playerGrade:"A",  fromTeam:"Nexus FC",       toTeam:"Apex Athletic",  status:"approved", requestedOn:"Jun 6"  },
]

// ── Admin page data ───────────────────────────────────────────────────────────

export const adminActivity = [
  { id:1, text:"Approved trade: Arjun Sharma → Nexus FC",           time:"1h ago"  },
  { id:2, text:"Updated BDR: Rahul Menon +200 pts",                 time:"2h ago"  },
  { id:3, text:"Logged result: Arjun Sharma W vs Vikram Nair (A+)", time:"3h ago"  },
  { id:4, text:"Grade assigned: Siddharth Roy → B",                 time:"5h ago"  },
  { id:5, text:"Fixture result entered: Nexus FC 3–1 Blaze FC",     time:"Jun 14"  },
  { id:6, text:"New season started, grades assigned",               time:"Jun 1"   },
]

export const allMatchRecords = [
  { id:1, playerId:1, playerName:"Arjun Sharma",  opponentName:"Rahul Menon",   opponentGrade:"A+", result:"win",  date:"Jun 14" },
  { id:2, playerId:1, playerName:"Arjun Sharma",  opponentName:"Vikram Nair",   opponentGrade:"A+", result:"win",  date:"Jun 12" },
  { id:3, playerId:1, playerName:"Arjun Sharma",  opponentName:"Kiran Reddy",   opponentGrade:"A",  result:"draw", date:"Jun 10" },
  { id:4, playerId:2, playerName:"Rahul Menon",   opponentName:"Arjun Sharma",  opponentGrade:"S",  result:"loss", date:"Jun 14" },
  { id:5, playerId:2, playerName:"Rahul Menon",   opponentName:"Kiran Reddy",   opponentGrade:"A",  result:"win",  date:"Jun 12" },
  { id:6, playerId:3, playerName:"Vikram Nair",   opponentName:"Suresh Kumar",  opponentGrade:"A",  result:"win",  date:"Jun 13" },
  { id:7, playerId:4, playerName:"Kiran Reddy",   opponentName:"Deepak Pillai", opponentGrade:"B",  result:"win",  date:"Jun 11" },
  { id:8, playerId:5, playerName:"Suresh Kumar",  opponentName:"Anil Krishnan", opponentGrade:"B",  result:"win",  date:"Jun 10" },
]

export const allPlayersAdmin = [
  { id:1, name:"Arjun Sharma",  team:"Nexus FC",       grade:"S",  bdrPoints:2840, marketValue:295, auctionPrice:250 },
  { id:2, name:"Rahul Menon",   team:"Phantom United", grade:"A+", bdrPoints:2330, marketValue:270, auctionPrice:200 },
  { id:3, name:"Vikram Nair",   team:"Storm City",     grade:"A+", bdrPoints:1980, marketValue:250, auctionPrice:185 },
  { id:4, name:"Kiran Reddy",   team:"Apex Athletic",  grade:"A",  bdrPoints:1740, marketValue:215, auctionPrice:160 },
  { id:5, name:"Suresh Kumar",  team:"Volt FC",        grade:"A",  bdrPoints:1540, marketValue:200, auctionPrice:140 },
  { id:6, name:"Deepak Pillai", team:"Surge Sports",   grade:"B",  bdrPoints:1280, marketValue:165, auctionPrice:110 },
  { id:7, name:"Anil Krishnan", team:"Blaze FC",       grade:"B",  bdrPoints:1080, marketValue:140, auctionPrice:90  },
  { id:8, name:"Pradeep Singh", team:"Alpha United",   grade:"C",  bdrPoints:720,  marketValue:90,  auctionPrice:60  },
  { id:9, name:"Rohan Das",     team:"Nexus FC",       grade:"A",  bdrPoints:1420, marketValue:190, auctionPrice:150 },
  { id:10,name:"Siddharth Roy", team:"Nexus FC",       grade:"B",  bdrPoints:1060, marketValue:140, auctionPrice:100 },
  { id:11,name:"Manish Iyer",   team:"Nexus FC",       grade:"C",  bdrPoints:560,  marketValue:80,  auctionPrice:55  },
]

export const pendingTradesAdmin = [
  { id:1, playerName:"Rahul Menon",   playerGrade:"A+", playerMV:270, fromTeam:"Nexus FC",      toTeam:"Phantom United", requestedOn:"Jun 13" },
  { id:2, playerName:"Arjun Sharma",  playerGrade:"S",  playerMV:295, fromTeam:"Storm City",    toTeam:"Nexus FC",       requestedOn:"Jun 12" },
  { id:4, playerName:"Siddharth Roy", playerGrade:"B",  playerMV:140, fromTeam:"Apex Athletic", toTeam:"Nexus FC",       requestedOn:"Jun 9"  },
]

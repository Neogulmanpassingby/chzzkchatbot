require('dotenv').config();
const buzzk = require("buzzk");
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// DB 연결 및 테이블 생성
const db = new Database('game_results.db');
db.prepare(`
    CREATE TABLE IF NOT EXISTS game_results (
        user_id TEXT PRIMARY KEY,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0
    )
`).run();

const emojis = ["{:chuu11:}", "{:chuuChuu13:}", "{:chuu10:}"];
const nid_aut = process.env.NID_AUT;
const nid_ses = process.env.NID_SES;

if (!nid_aut || !nid_ses) {
    console.error("NID_AUT 또는 NID_SES가 설정되지 않았습니다.");
    process.exit(1);
}

buzzk.login(nid_aut, nid_ses);
const buzzkChat = buzzk.chat;

// ──────────────── 기능별 함수 분리 ────────────────

function randomEmoji() {
    return emojis[Math.floor(Math.random() * emojis.length)];
}

async function handleRCP(chat, userId, userChoice) {
    const RCP = ["가위", "바위", "보"];
    const botChoice = RCP[Math.floor(Math.random() * RCP.length)];

    if (!RCP.includes(userChoice)) {
        return chat.send("가위, 바위, 보 중 하나를 입력해주세요! 예: !가위바위보 가위");
    }

    let result;
    if (userChoice === botChoice) result = "draw";
    else if (
        (userChoice === "가위" && botChoice === "보") ||
        (userChoice === "바위" && botChoice === "가위") ||
        (userChoice === "보" && botChoice === "바위")
    ) result = "win";
    else result = "loss";

    const stats = {
        user_id: userId,
        wins: result === "win" ? 1 : 0,
        losses: result === "loss" ? 1 : 0,
        draws: result === "draw" ? 1 : 0,
    };

    db.prepare(`
        INSERT INTO game_results (user_id, wins, losses, draws)
        VALUES (@user_id, @wins, @losses, @draws)
        ON CONFLICT(user_id) DO UPDATE SET
            wins = wins + @wins,
            losses = losses + @losses,
            draws = draws + @draws
    `).run(stats);

    const userStats = db.prepare(`SELECT wins, losses, draws FROM game_results WHERE user_id = ?`).get(userId);
    const resultText = {
        win: "이겼습니다! {:chuu11:}{:chuu11:}",
        loss: "졌습니다ㅠㅠ {:chuu4:}{:chuu4:}",
        draw: "비겼습니다! {:chuu10:}{:chuu10:}"
    };

    return chat.send(`봇의 선택 => ${botChoice} ${resultText[result]}\n현재 전적: ${userStats.wins}승 ${userStats.losses}패 ${userStats.draws}무`);
}

async function getStockInfo(stockName, serviceKey) {
    const url = "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";
    const params = {
        serviceKey,
        resultType: 'json',
        likeItmsNm: stockName,
        numOfRows: 1,
        pageNo: 1,
    };
    try {
        const response = await axios.get(url, { params });
        return response.data?.response?.body?.items?.item?.[0] || null;
    } catch (error) {
        console.error("주식 API 요청 실패:", error.message);
        return null;
    }
}

// ──────────────── 메인 실행 ────────────────

async function main() {
    const channelSearch = await buzzk.channel.search("ㅇㅇㅇ"); 
    const channel = channelSearch[0];
    const chat = new buzzkChat(channel.channelID);
    await chat.connect();
    console.log("Chat connected.");

    chat.onMessage(async (data) => {
        for (const msg of data) {
            const text = msg.message;
            const userId = (await chat.getUserInfo(msg.author.id))?.id || `guest_${msg.author.id}`;

            if (text.startsWith("!가위바위보")) {
                const userChoice = text.split(" ")[1];
                await handleRCP(chat, userId, userChoice);
            } else if (text.startsWith("!주가")) {
                const stockName = text.split(" ")[1];
                const stock = await getStockInfo(stockName, process.env.STOCK_API_KEY);
                if (stock)
                    await chat.send(`${stockName} 현재가: ${stock.clpr}원, 고가: ${stock.hipr}원, 저가: ${stock.lopr}원`);
                else
                    await chat.send(`"${stockName}" 종목을 찾을 수 없습니다.`);
            } else if (text === "!업타임") {
                const lvDetail = await buzzk.live.getDetail(channel.channelID);
                const ms = new Date() - new Date(lvDetail.startOn);
                const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
                await chat.send(`${h}시간 ${m}분 ${s}초 ${randomEmoji()}${randomEmoji()}`);
            } else if (text === "!시청자수") {
                const lvDetail = await buzzk.live.getDetail(channel.channelID);
                await chat.send(`${randomEmoji()} 시청자 수 ${lvDetail.userCount.now}명 돌파 ${randomEmoji()}`);
            } else if (text === "!방제") {
                const lvDetail = await buzzk.live.getDetail(channel.channelID);
                await chat.send(`현재 방제: ${lvDetail.title}`);
            } else if (text === "!명령어") {
                await chat.send("사용 가능 명령어: !가위바위보, !주가, !업타임, !스펙, !방제, !시청자수등");
            } else if (text === "!팔로우") {
                const userInfo = await chat.getUserInfo(msg.author.id);
                const diff = new Date() - new Date(userInfo.followDate);
                const days = Math.floor(diff / 86400000);
                await chat.send(`팔로우한 지 ${days}일 경과 ${randomEmoji()}${randomEmoji()}`);
            }
        }
    });

    // 랜덤 메시지 반복
    function autoMessageLoop() {
        const delay = Math.floor(Math.random() * (250000 - 150000 + 1)) + 100000;
        const message = `꾹이 햄부기 맛잇당 ${randomEmoji()} ${randomEmoji()}`;
        chat.send(message).catch(console.error);
        setTimeout(autoMessageLoop, delay);
    }
    autoMessageLoop();

    chat.onDisconnect(() => {
        console.log("Chat disconnected.");
    });
}

main();


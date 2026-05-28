import TelegramBot from "node-telegram-bot-api";
import "dotenv/config"
import { addUser ,addRepo,addWatch,removeWatch,
getWatchedById,
} from "./db";

const token=process.env.BOT_TOKEN

const bot=new TelegramBot(token,{polling:true})

bot.onText(/\/start/,(msg)=>{

})

bot.onText(/\/watch/,(msg)=>{

})

bot.onText(/\/list/,(msg)=>{

})

bot.onText(/\/remove/,(msg)=>{

})

console.log("bot is running")
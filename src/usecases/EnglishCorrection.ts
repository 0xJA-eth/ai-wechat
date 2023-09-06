import { log, Message } from 'wechaty';
import { MessageJSON } from '../utils/MessageUtils';
import { LOGPRE } from '../main';
import { post } from '../utils/APIUtils';

const CorrectEnglish = post<{
  api_key: string, prompt: string, content?: string
}, {
  reply: string
}>("http://127.0.0.1:8090", "/generate2")

const APIKey = process.env.OPENAI_API_KEY
const MonitorRooms = process.env.MONITOR_ROOMS?.split(',') || [];
const MonitorUsers = process.env.MONITOR_USERS?.split(',') || [];

function isEnable(text) {
  // 使用正则表达式匹配英文单词
  const regex = /[a-zA-Z]+/;
  return regex.test(text);
}

export default async function(message: Message, json: MessageJSON) {
  let { chatName, talkerName, text } = json;

  if (message.self()) return false

  if (!isEnable(text)) return false
  if (!MonitorRooms.includes(chatName)) return false

  const room = message.room();
  if (room && !await message.mentionSelf()) return false

  text = text.replace(/@.+?\s/g, "").trim()
  if (!text.startsWith("纠正")) return false
  text = text.replace("纠正", "").trim()

  try {
    const { reply } = await CorrectEnglish({
      prompt: `你是一个英语老师，请您纠正我下面说的英文内容的语法错误、拼写错误和表达错误，并将其翻译为中文。
如果你认为有错误，回答的格式为：
原文：原文内容
问题：1.XXX，2.XXX，3.XXX ...
纠正：纠正后的原文
翻译：原文翻译

如果你认为没有错误，回答的格式为：
原文：原文内容
翻译：原文翻译

如果你认为我说的不是英文，回复null。

我说的内容是：
${text}`,
      api_key: APIKey
    });
    if (reply.toLowerCase() != "null") {
//             const replyText = `「${talkerName}：${text}」
// - - - - - - - - - - - - - - -
// ${reply}`
      const replyText = `${reply} `
      await room?.say(replyText)
      await (message.self() ? message.listener() : message.talker())?.say(replyText)

      return true;
    }
  } catch (e) {
    log.error(LOGPRE, "generate reply fail:", e)
  }
}
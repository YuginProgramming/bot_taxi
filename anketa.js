import { bot } from "./app.js";
import { phrases, keyboards } from './language_ua.js';
import { 
  updateUserByChatId,
  userLogin,
  findUserByChatId,
  createNewUserByChatId
} from './models/users.js';
import { findBalanceByChatId } from './models/bonuses.js'
import axios from 'axios';
import { numberFormatFixing } from './modules/validations.js';
import { logger } from "./logger/index.js";
import { findApiUserByChatId, updateApiUserByChatId } from './models/api-users.js';
import { createCard, findCardById, updateCardById } from "./models/cards.js";
import { getCardData } from './modules/checkcardAPI.js';

export const anketaListiner = async() => {
    bot.on("callback_query", async (query) => {

      const action = query.data;
      const chatId = query.message.chat.id;

      const userInfo = await findUserByChatId(chatId);

        let dialogueStatus, isAuthenticated, tempData, userDatafromApi, balance, cardNumber, firstname;

        if (userInfo) {
          dialogueStatus = userInfo.dialoguestatus;
          isAuthenticated = userInfo.isAuthenticated;

          if (userInfo.hasOwnProperty("lastname")) {
            const data = JSON.parse(userInfo.lastname);
            userDatafromApi = data;
          }
          if (userInfo.hasOwnProperty("fathersname")) {
            tempData = userInfo.fathersname;
          }
          if (userInfo.hasOwnProperty("goods")) {
            balance = userInfo.goods;
          }
          if (userInfo.hasOwnProperty("units")) {
            cardNumber = userInfo.units;
          }
          if (userInfo.hasOwnProperty("firstname")) {
            firstname = userInfo.firstname;
          }          
        }
      
      switch (action) {
        case '/mainNoCard':
            await userLogin(chatId);
            const userData = await findApiUserByChatId(chatId)
            const url = 'https://soliton.net.ua/water/api/card/link/index.php'; // Replace with the actual URL
            const requestData = {
                user_id: userData.user_id,
                card_id: userData.phone,
            };
            const response = await axios.post(url, requestData);

            if(response.data.status === 'success' || response.data.error === 'card already linked to user') {
              const userCard = await axios.get(`http://soliton.net.ua/water/api/user/index.php?phone=${userInfo.phone}`);

              const virtualCard = userCard.data.user.card[0]

              await updateApiUserByChatId(chatId, { cards: virtualCard.ID });

              await createCard({
                cardId: virtualCard.ID,
                Number: virtualCard.Number,
                Card: virtualCard.Card,
                Type: virtualCard.Type,
                CardGroup: virtualCard.CardGroup,
                WaterQty: virtualCard.WaterQty,
                AllQty: virtualCard.AllQty,
                MoneyPerMonth: virtualCard.MoneyPerMonth,
                LitersPerDay: virtualCard.LitersPerDay,
                Discount:  virtualCard.Discount,
                status: virtualCard.status
              })
            }

            bot.sendMessage(chatId, phrases.welcomeNoCard, {
              reply_markup: { keyboard: keyboards.mainMenu, resize_keyboard: true, one_time_keyboard: true }
            });       
          break;  

        case 'call_support':
          bot.sendMessage(chatId, 'Будь ласка, подзвоніть за номером: +380970000000');
        break;
      }
    });
    
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;       
          
      const apiData = await findApiUserByChatId(chatId); 

      let card = {};

      if (apiData?.cards) {
        card = await findCardById(apiData?.cards);
      }
        
      const userInfo = await findUserByChatId(chatId);
        

      let dialogueStatus, isAuthenticated, tempData, userDatafromApi, balance, cardNumber, firstname, cardCard;

      if (userInfo) {
          dialogueStatus = userInfo.dialoguestatus;
          isAuthenticated = userInfo.isAuthenticated;

          if (userInfo.hasOwnProperty("lastname")) {
            const data = JSON.parse(userInfo.lastname);
            userDatafromApi = data;
          }
          if (userInfo.hasOwnProperty("fathersname")) {
            tempData = userInfo.fathersname;
          }
          if (userInfo.hasOwnProperty("goods")) {
            balance = userInfo.goods;
          }
          if (card.hasOwnProperty("Number")) {
            cardNumber = card?.Number;
          }
          if (userInfo.hasOwnProperty("firstname")) {
            firstname = userInfo.firstname;
          }
          if (card.hasOwnProperty("Card")) {
            cardCard = card.cardId;
          } 
      }
  
      switch (msg.text) {
        
        case '/start':
          if(userInfo) await updateUserByChatId(chatId, { dialoguestatus: '' });
          if (isAuthenticated) 
            bot.sendMessage(msg.chat.id, phrases.mainMenu, {
              reply_markup: { keyboard: keyboards.mainMenu, resize_keyboard: true, one_time_keyboard: true }
            });
          else {
            logger.info(`USER_ID: ${chatId} join BOT`);
            await createNewUserByChatId(chatId);
            await updateUserByChatId(chatId, { dialoguestatus: 'phoneNumber' });
            bot.sendMessage(msg.chat.id, phrases.greetings, {
              reply_markup: { keyboard: keyboards.contactRequest, resize_keyboard: true, one_time_keyboard: true }
            });  

          }
        break;


        case 'Повернутися до головного меню':
        case 'До головного меню':
          await updateUserByChatId(chatId, { dialoguestatus: '' });
          if (isAuthenticated) {
            bot.sendMessage(msg.chat.id, phrases.mainMenu, {
              reply_markup: { keyboard: keyboards.mainMenu, resize_keyboard: true, one_time_keyboard: true }
            });  
            return;
          } else {
            bot.sendMessage(msg.chat.id, 'Ви не авторизовані', {
              reply_markup: { keyboard: keyboards.login, resize_keyboard: true, one_time_keyboard: true }
            });  
          }
        break;

        case 'Зареєструватись':
        case '/register':
          if(userInfo) {
            bot.sendMessage(chatId, `Ви вже зареєстровані, будь ласка, авторизуйтесь`,{
              reply_markup: { keyboard: keyboards.login, resize_keyboard: true, one_time_keyboard: true }
            });
          } else {
            
            await createNewUserByChatId(chatId);
            bot.sendMessage(msg.chat.id, phrases.contactRequest, {
              reply_markup: { keyboard: keyboards.contactRequest, resize_keyboard: true, one_time_keyboard: true }
            });  
          }
          break;

        case 'Мій профіль':

        const cardId = apiData?.cards;

        const card = await getCardData(userDatafromApi, cardId)

        console.log(card)

          await updateCardById( cardId,
            {
              WaterQty: card.WaterQty,
              AllQty: card.AllQty,
              MoneyPerMonth: card.MoneyPerMonth,
              LitersPerDay: card.LitersPerDay,
              Discount:  card.Discount,
            }
          )
          
          const nextLevel = (discount, turnover) => {
            if (discount == 20) {
              return 1000 - turnover;
            } else if (discount == 25) {
              return 2000 - turnover;
            } else {
              return 'максимальна знижка';
            }
          }
          
          const bonusBalace = await findBalanceByChatId(chatId);
          
          const balanceMessage = `
баланс: бла бла
          `
          bot.sendMessage(msg.chat.id, balanceMessage, {
            reply_markup: { keyboard: keyboards.mainMenuButton, resize_keyboard: true, one_time_keyboard: true }
          });
          break;


        case 'Служба підтримки': 
          bot.sendMessage(msg.chat.id, 'Шановні клієнти, служба підтримки працює за графіком: Пн-Пт з 8:00 до 22:00, Сб-Нд з 9:00 до 20:00', {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Подзвонити', callback_data: 'call_support' }],
                [{ text: 'Написати в Телеграм', url: 'https://t.me/YevhenDudar' }]
              ]
            }
          });
        break;
      };

      switch (dialogueStatus) {

        case 'phoneNumber':
          if (msg.contact) {
            console.log('contact')
            const phone = numberFormatFixing(msg.contact.phone_number);
            try {
              await updateUserByChatId(chatId, { phone, dialoguestatus: 'name' });
              await bot.sendMessage(chatId, phrases.nameRequest);
            } catch (error) {
              logger.warn(`Cann't update phone number`);
            }
          } else if (msg.text) {
            if (msg.text.length === 9 && !isNaN(parseFloat(msg.text))) {
              console.log('phone')

              const phone = numberFormatFixing(msg.text);
              try {
                await updateUserByChatId(chatId, { phone, dialoguestatus: 'name' });
                await bot.sendMessage(chatId, phrases.nameRequest);
              } catch (error) {
                logger.warn(`Cann't update phone number`);
              }  
            } else {
              await bot.sendMessage(chatId, phrases.wrongPhone);
            }
          }  
    
        break;
      }
  });
};


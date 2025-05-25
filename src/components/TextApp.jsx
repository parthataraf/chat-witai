import React, { useEffect, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { BeatLoader } from 'react-spinners';

import TextAppMessageList from './TextAppMessageList';
import Constants from '../constants/Constants';
import _default from 'react-bootstrap/esm/Accordion';

const CS571_WITAI_ACCESS_TOKEN = "PQGIWWQSBY5MEB2D4CWYQ774PX2REISL";

function TextApp() {

    // Set to true to block the user from sending another message
    const [isLoading, setIsLoading] = useState(false);

    const [messages, setMessages] = useState([]);
    const inputRef = useRef();

    const helpMessages = [ 
        "Try to get a list of chatrooms or the latest messages; just ask me!",
        "You can either get a list of chatrooms or get the latest messages; just ask me!",
        "I can help you find chatrooms and show you posts in chatrooms. Please let me know what you need!"
    ];

    const chatRoomMessages = [ 
        "You can visit...",
        "Here is the list of chatrooms you can vist...",
        "There are many chatrooms that you can visit..."
    ];

    const unknownMessages = [ 
        "I'm sorry, I don't understand.",
        "I didn't understand. Can you rephrase?",
        "Oh no! I am not sure what you mean."
    ];

    function getRandomNumber(maxValue){
        return Math.floor(Math.random() * (maxValue + 1));
    }

    /**
     * Called when the TextApp initially mounts.
     */
    async function handleWelcome() {
        addMessage(Constants.Roles.Assistant, "Welcome to BadgerChat! How can I help you?");
    }

    /**
     * Called whenever the "Send" button is pressed.
     * @param {Event} e default form event; used to prevent from reloading the page.
     */
    async function handleSend(e) {
        e?.preventDefault();
        const input = inputRef.current.value?.trim();
        setIsLoading(true);
        if(input) {
            addMessage(Constants.Roles.User, input);
            inputRef.current.value = "";
            const resp = await fetch("https://api.wit.ai/message?q=" + encodeURIComponent(input), {
                headers: {
                    "Authorization": "Bearer " + CS571_WITAI_ACCESS_TOKEN
                }
            })
            const data = await resp.json();
            console.log(data);

            const matchedName = data.intents[0]?.name;
            if (!matchedName){
                addMessage(Constants.Roles.Assistant, unknownMessages[getRandomNumber(2)]);
            }
            else if (matchedName === "get_help"){
                addMessage(Constants.Roles.Assistant, helpMessages[getRandomNumber(2)]);
            }
            else if (matchedName === "get_chatrooms"){
                await getChatRooms();
            }
            else if (matchedName === "get_messages"){
                await getMessages(data);
            } 
            else 
            {
                addMessage(Constants.Roles.Assistant, "I am sorry. I am not familiar with this message.")
            }
        }
        setIsLoading(false);
    }

    async function getChatRooms()
    {
        const result = await fetch("https://cs571api.cs.wisc.edu/rest/s25/hw10/chatrooms", {
            headers: {
                "X-CS571-ID": CS571.getBadgerId()   
            }
        });
        const chatrooms = await result.json();
        console.log(chatrooms);

        if (chatrooms == null || chatrooms.length == 0){
            addMessage(Constants.Roles.Assistant, "No chatrooms were found!");
            return; 
        }

        const joinedRooms = chatrooms.join(", ");
        const messageResponse = `${chatRoomMessages[getRandomNumber(2)]}${joinedRooms}`;
        addMessage(Constants.Roles.Assistant, messageResponse)
    }

    async function getMessages(witData)
    {
        const hasNumber = witData.entities["wit$number:number"] ? true : false;
        const hasChatRoom = witData.entities["chatroom_name:chatroom_name"] ? true : false;

        const  numPosts = hasNumber ? witData.entities["wit$number:number"][0].value : 1;
        const chatRoom = hasChatRoom ? witData.entities["chatroom_name:chatroom_name"][0].value : '';

        const url = `https://cs571api.cs.wisc.edu/rest/s25/hw10/messages?chatroom=${chatRoom}&num=${numPosts}`

        const result = await fetch(url, {
            headers: {
                "X-CS571-ID": CS571.getBadgerId()   
            }
        });

        const messageResult = await result.json();
        console.log(messageResult);

        if (!messageResult.messages || messageResult.messages.length == 0){
            addMessage(Constants.Roles.Assistant, "Sorry. No messages were found.")            
            return; 
        }

        const messageTypeIndex = getRandomNumber(2);
        console.log("messageTypeIndex =" + messageTypeIndex);
        for (const message of messageResult.messages){
            let messageDesc = "";
            
            if (messageTypeIndex == 0){
                messageDesc = `Title: '${message.title}', Message: '${message.content}', Posted by: '${message.poster}', Chatroom: '${message.chatroom}'`;
            }
            else if (messageTypeIndex == 1){
                messageDesc = `'${message.poster}' created a post titled '${message.title}' in '${message.chatroom}' saying '${message.content}'`;
            }
            else{
                messageDesc = `Poster: '${message.poster}', Chatroom: '${message.chatroom}',  Title: '${message.title}', Message: '${message.content}'`;
            }

            addMessage(Constants.Roles.Assistant, messageDesc)            
        }
    }
    /**
     * Adds a message to the ongoing TextAppMessageList
     * 
     * @param {string} role The role of the message; either "user" or "assistant"
     * @param {*} content The content of the message
     */
    function addMessage(role, content) {
        setMessages(o => [...o, {
            role: role,
            content: content
        }]);
    }

    useEffect(() => {
        handleWelcome();
    }, []);

    return (
        <div className="app">
            <TextAppMessageList messages={messages}/>
            {isLoading ? <BeatLoader color="#36d7b7"/> : <></>}
            <div className="input-area">
                <Form className="inline-form" onSubmit={handleSend}>
                    <Form.Control
                        ref={inputRef}
                        style={{ marginRight: "0.5rem", display: "flex" }}
                        placeholder="Type a message..."
                        aria-label='Type and submit to send a message.'
                    />
                    <Button type='submit' disabled={isLoading}>Send</Button>
                </Form>
            </div>
        </div>
    );
}

export default TextApp;

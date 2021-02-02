import { Component, OnInit, Input, OnChanges, Output, EventEmitter } from '@angular/core';
declare var $: any;
import * as io from 'socket.io-client';

import { Chat } from 'src/app/models/chat.model';
import { Member } from 'src/app/models/member.model';
import { Message } from '../../models/message.model';
import { User } from 'src/app/models/user.model';

import { UserService } from 'src/app/services/user.service';
import { MessageService } from '../../services/message.service';
import { global } from '../../services/global'; 
import { ChatService } from '../../services/chat.service';
import { Router } from '@angular/router';

import Swal from 'sweetalert2'

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styles: []
})
export class ChatComponent implements OnInit, OnChanges  {

  @Input()  public chat: Chat;
  @Input()  public members: Member[];
  @Input()  public user: User;
  @Output() public removeChatItem = new EventEmitter();

  public token: string;
  public identity: User;
  public messages: Message[];
  public message: Message;
  public loaderMessages: boolean;
  public alertMessage: string;
  public status: string;
  public textMessage: string;
  public url: string;
  public deletedChat: boolean;
  public editChatModel: Chat;

  // socket
  public socket: any;

  constructor( 
    private _userService: UserService, 
    private _messageService: MessageService,
    private _chatService: ChatService,
    private _router: Router
  ) {
    this.token = this._userService.getToken();
    this.loaderMessages = false;
    this.messages = [];
    this.identity = this._userService.getIdentity();
    this.socket = io('https://app-chat-daniel.herokuapp.com/');
    this.url = global.url;
    this.deletedChat = false;
    
   }

  ngOnInit() {
   this.socketPush();
   this.editChatModel = new Chat(null, '', '', '', null, '');
  }

  ngOnChanges() {
    /* OBTENER TODOS LOS MENSAJES DEL CHAT */
    this.getMessages();

    /* ACTUALIZAR VARIABLE DE BORRADO */
    this.deletedChat = false;

    /* RELLENAR PROPIEDADES PARA EDITAR EL CHAT */
    if(this.chat) {
      this.editChatModel.description = this.chat.description;
      this.editChatModel.title = this.chat.title;
    }
    

  }

  // Onbtener todos los mensajes de un chat
  getMessages() {
    this.loaderMessages = true;
      if(this.chat) {
        this._messageService.getMessages(this.token, this.chat._id).subscribe( resp => {
          if(resp.messages) {
            this.messages = resp.messages;
            this.status = 'success';

            this.loaderMessages = false;
           
            /* bajar el scroll */
            this.scrollDown(400);
          }
        }, error => {
          this.status = 'error';
          this.alertMessage = error.error.message;
          this.loaderMessages = false;
        } );
      }
  }

  // Obtener el mensaje desde el servidor por medio del socket
  socketPush() {
    this.socket.on('sendMessage', function(resp: any) {
      /*
      * comprobar que sea del chat para evitar intersección de señales
      */
      if(resp.message.chat === this.chat._id) {
        const newMessage: Object = {
          user: resp.user,
          text: resp.message.text,
          image: resp.user.image,
          created_at: resp.message.created_at
        };
  
        this.messages.push(newMessage);
      }

      this.scrollDown(300);
      
    }.bind(this));
  }

  // Guardar un nuevo mensaje
  sendMessage() {
    if(!this.textMessage) return;
    
    this.message = new Message(this.identity._id, this.chat._id, this.textMessage, '');

    this._messageService.sendMessage(this.token, this.message).subscribe( resp => {
      if(resp.message && resp.user) {

        //this.getMessages();
       
        /* enviar la información al servidor por medio del socket */
        this.socket.emit('saveMessage', resp);

        /* vaciar los campos */
        this.message = new Message(null, '','','');
        this.textMessage = null;

      }
    }, error => {
      this.status = 'error';
      this.alertMessage = error.error.message;
    } );

  }


  // Eliminar el chat
  deleteChat( chatId) {

    this._chatService.deleteChat(this.token, chatId).subscribe(chat => {

        this.deletedChat = true;
        // Emitir el chat que fue eliminado
        this.removeChatItem.emit(chat);
        // Quitar el modal
        document.getElementById('id05').style.display='none';
        
    });
  }

  // Editar el chat
  editChat() {

    // Completar el objeto con las propiedades faltantes
    this.chat.description = this.editChatModel.description;
    this.chat.title = this.editChatModel.title;

    this._chatService.updateChat(this.token, this.chat._id, this.chat).subscribe(chat => {
       this.status = 'success';
       this.alertMessage = 'Chat updated !';

       setTimeout(() => {
        this.status = null;
        this.alertMessage = null;
       }, 2000)
       
       this.chat = chat;
       
    }, error => {
      this.status = 'error';
      this.alertMessage = error.error.message;
    });
  }


  // Bajar el scroll en los mensajes 
  scrollDown(time){
    // Scroll down
    $(document).ready(function(){
        var measurement = $("#messagesList").prop("scrollHeight");  // Obtener el tamaño del scroll del div
        $("#messagesList").animate({ scrollTop: measurement}, time);
    });
}





}

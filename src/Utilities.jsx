export function dateFormat(dateString) {
    return new Date(dateString).toLocaleString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

export function groupMessagesByDate(messages){
    console.log(messages);
    if(messages.length > 0){
        const groupedMessages = {};
        messages.forEach((msg)=>{
            const date = new Date(msg.timestamp).toDateString();
            if(!groupedMessages[date]){
                groupedMessages[date] = [];
            }
            groupedMessages[date].push(msg);
        });
        
        return groupedMessages;
    }
}

export function convertDateToReadable(dateString) {
  const messageDate = new Date(dateString);
  const today = new Date();

  const isToday = messageDate.toDateString() === today.toDateString();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = messageDate.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return messageDate.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
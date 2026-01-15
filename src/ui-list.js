// ui-list.js
export const ListManager = {
    addEventToList: (event, name) => {
        const list = document.getElementById('event-list');
        const item = document.createElement('li');
        item.style.padding = "10px";
        item.style.borderBottom = "1px solid #ddd";
        item.style.fontSize = "12px";
        
        const date = new Date(event.created_at * 1000).toLocaleTimeString();
        
        item.innerHTML = `
            <strong>[${date}] @${name}:</strong> 
            <span>${event.content}</span>
            <br>
            <small style="color: #666;">ID: ${event.id.substring(0, 10)}... | Tags: ${JSON.stringify(event.tags)}</small>
        `;
        
        list.prepend(item); // Pone el más nuevo arriba
    }
};
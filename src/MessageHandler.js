

/**
 * Simple postMessage handler
 */
class MessageHandler {
    /**
     * Create new postMessage handler
     * @example
     * new MessageHandler().addListener(data => console.log(data)).listen()
     */
    constructor() {
        this.onmessage = [];
        this.listener = null;
        this.log = typeof window.log === "function" ? window.log : null;
    }

    _handleMessage(ev) {
        if (this.log) {
            this.log(`[MSG][${ev.origin}]: `, ev.data);
        } else {
            console.log(`[MSG][${ev.origin}]: `, ev.data)
        }

        this.onmessage.forEach((cb) => {
            cb(ev.data, ev.origin)
        })
    }
    /**
     * Return a promise that resolve with the next message data.
     * 
     * @param {Function} [filter]  A filter function, taking data and origin as parameter and returning a boolean whether
     * or not resolving to the message
     * @returns {Promise<String>} message data
     * @example
     * const mh = new MessageHandler().listen()
     * const data = await mh.waitForMessage((data, origin) => origin == "https://victim.example")
     * console.log(data) 
     */
    waitForMessage(filter = () => true) {
        return new Promise(resolve => {
            const callback = (data, origin) => {
                if (filter(data, origin)) {
                    resolve(data)
                    this.removeListener(callback)
                }
            }
            this.addListener(callback)
        })
    }

    /**
     * Start the messageHandler listener
     * @returns {this}
     */
    listen() {
        this.listener = window.addEventListener("message", (ev) => this._handleMessage(ev));
        return this;
    }

    /**
     * Stop the messageHandler listener
     * @returns {this}
     */
    stop() {
        window.removeEventListener("message", this.listener)
        return this
    }


    /**
     * Change the logger function, by default the message are printed in the console 
     * @param {Function} f The new log function
     * @returns {this}
     */
    logMessages(f) {
        this.log = f;
        return this;
    }

    /**
     * Add a callback function to call on all received message
     * @param {Function} f Function to add to the callback list
     * @returns  {this}
     */
    addListener(f) {
        this.onmessage.push(f)
        return this
    }
    /**
     * Remove a callback function
     * @param {Function} f Function to remove from the callback list
     * @returns {this}
     */
    removeListener(f) {
        this.onmessage = this.onmessage.filter(x => x != f)
        return this
    }
}


export default MessageHandler
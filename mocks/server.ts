// src/mocks/server.js
import { setupServer } from 'msw/node'
import { rest } from 'msw'

// This configures a request mocking server with the given request handlers.
export const handlers = [
    rest.put('https://goatsfordays.com/client/:clientId', (req, res, ctx) => {
        // Persist user's authentication in the session
        return res(
            // Respond with a 200 status code
            ctx.json({
                goats: 'always'
            }),
        )
    })
]
export const server = setupServer(...handlers)


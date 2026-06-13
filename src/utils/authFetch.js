// src/utils/authFetch.js

export async function authFetch(url, options = {}) {
    const auth = JSON.parse(localStorage.getItem("auth"));

    const makeRequest = async (token) => {
        return fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
    };

    // 1️⃣ Try with current access token
    let res = await makeRequest(auth?.tokens?.accessToken);

    if (res.status !== 401) {
        return res;
    }

    // 2️⃣ Try refresh ONCE
    const refreshRes = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                refreshToken: auth?.tokens?.refreshToken,
            }),
        }
    );

    if (!refreshRes.ok) {
        // do NOT hard logout here.
        throw new Error("Refresh Failed");
    }

    const refreshJson = await refreshRes.json();

    const updatedAuth = {
        ...auth,
        tokens: {
            ...auth.tokens,
            accessToken: refreshJson.data.accessToken,
        },
    };

    localStorage.setItem("auth", JSON.stringify(updatedAuth));

    // 3️⃣ Retry original request ONCE
    return makeRequest(refreshJson.data.accessToken);
}

from __future__ import annotations


def test_cors_preflight_allows_localhost(client):
    response = client.options(
        "/api/v1/diagrams",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-share-slug",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "POST" in (response.headers.get("access-control-allow-methods") or "")

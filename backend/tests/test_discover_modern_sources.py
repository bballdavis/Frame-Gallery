"""Covers the modern, pop and illustration sources, and the keys and flags that gate them.

Run with: pytest tests/test_discover_modern_sources.py
"""

import sys

import pytest
from discover_fakes import FakeNet, FakeResponse

from utils.discover import SOURCES, credentials, source_info
from utils.discover.common import DiscoverError, DiskCache
from utils.discover.deviantart import deviantart

# The package re-exports the instance under the module's name, so fetch the module itself.
deviantart_module = sys.modules["utils.discover.deviantart"]
from utils.discover.flickr import flickr
from utils.discover.pixabay import pixabay
from utils.discover.smithsonian import cooper_hewitt, saam
from utils.discover.wallhaven import wallhaven
from utils.discover.wikimedia import illustrations, modern, popart, ukiyoe


@pytest.fixture
def net(monkeypatch, tmp_path):
    monkeypatch.setattr(DiskCache, "directory", str(tmp_path / "cache"))
    credentials.replace_all({})
    monkeypatch.setitem(deviantart_module._token, "value", None)
    yield FakeNet().install(monkeypatch)
    credentials.replace_all({})


def set_keys(**services):
    credentials.replace_all(services)


# --- Keys are entered in Settings --------------------------------------------------


def test_sources_that_need_a_key_refuse_until_it_is_set_in_settings(net):
    needing = {"saam", "cooperhewitt", "flickr", "pixabay", "deviantart"}
    assert needing == {sid for sid, s in SOURCES.items() if source_info(s)["credentials"]}
    assert not any(source_info(s)["credentials"]["configured"] for sid, s in SOURCES.items() if sid in needing)
    with pytest.raises(DiscoverError) as error:
        flickr.search("x", 1, True, "any")
    assert error.value.status == 503 and "Settings" in str(error.value)

    set_keys(flickr={"api_key": "k"}, smithsonian={"api_key": "k"}, deviantart={"client_id": "a"})
    info = {sid: source_info(s)["credentials"]["configured"] for sid, s in SOURCES.items() if sid in needing}
    # DeviantArt is not ready until both its ID and its secret are set.
    assert info == {"saam": True, "cooperhewitt": True, "flickr": True, "pixabay": False, "deviantart": False}


def test_source_info_never_includes_a_secret(net):
    set_keys(flickr={"api_key": "super-secret"})
    assert "super-secret" not in repr(source_info(flickr))


def test_personal_use_sources_are_flagged_and_the_rest_are_not(net):
    assert {sid for sid, s in SOURCES.items() if source_info(s)["flagged"]} == {"wallhaven", "deviantart"}


# --- Smithsonian ---------------------------------------------------------------------


def si_record(record_id, title="Pop Study", access="CC0", media_access="CC0", width=4000, height=2250):
    return {
        "id": record_id,
        "content": {
            "freetext": {
                "name": [{"label": "Artist", "content": "Jane Doe, American, 1920-2000"}],
                "date": [{"label": "Date", "content": "1965"}],
            },
            "descriptiveNonRepeating": {
                "title": {"content": title},
                "record_link": f"https://americanart.si.edu/artwork/{record_id}",
                "metadata_usage": {"access": access},
                "online_media": {"media": [{
                    "type": "Images", "idsId": f"SAAM-{record_id}", "usage": {"access": media_access},
                    "resources": [{"label": "High-resolution JPEG", "width": width, "height": height}],
                }]},
            },
        },
    }


def test_smithsonian_searches_one_museum_and_keeps_only_cc0_pictures(net, monkeypatch):
    set_keys(smithsonian={"api_key": "secret"})
    net.add("openaccess/api/v1.0/search", FakeResponse({"response": {"rowCount": 100, "rows": [
        si_record("a"), si_record("b", access="Usage conditions apply"), si_record("c", media_access="Restricted"),
    ]}}))

    page = saam.search('pop" OR unit_code:"X', 2, True, "any")

    params = net.calls[0]["params"]
    assert params["api_key"] == "secret" and params["start"] == 24
    assert params["q"].endswith('AND online_media_type:"Images" AND unit_code:"SAAM"')
    assert 'unit_code:"X' not in params["q"]   # typed operators are neutralised
    assert [item["id"] for item in page["results"]] == ["a"]
    item = page["results"][0]
    assert (item["title"], item["artist"], item["date"]) == ("Pop Study", "Jane Doe", "1965")
    assert item["thumb_url"] == "https://ids.si.edu/ids/deliveryService?id=SAAM-a&max=480"
    assert page["has_more"] is True and page["total"] == 100


def test_smithsonian_download_asks_the_image_server_to_scale_huge_scans(net, monkeypatch):
    set_keys(smithsonian={"api_key": "secret"})
    net.add("content/", FakeResponse({"response": si_record("a", width=12000, height=6000)}))

    plan = cooper_hewitt.plan("a", "fill")

    assert plan.url == "https://ids.si.edu/ids/deliveryService?id=SAAM-a&max=6000"
    assert (plan.width, plan.height) == (6000, 3000)
    assert plan.license == "Public domain (CC0)" and plan.artist == "Jane Doe"


def test_smithsonian_without_a_key_refuses_politely(net):
    with pytest.raises(DiscoverError) as error:
        saam.search("x", 1, True, "any")
    assert error.value.status == 503


# --- Wikimedia Commons: the modern collections ------------------------------------------


def commons_page(page_id, license_name, title="File:Digital sunrise.jpg", artist="Ann Artist"):
    return {"pageid": page_id, "title": title, "index": page_id, "imageinfo": [{
        "width": 4000, "height": 2250, "mime": "image/jpeg",
        "url": f"https://upload.wikimedia.org/original/{page_id}.jpg",
        "thumburl": f"https://upload.wikimedia.org/thumb/{page_id}.jpg",
        "descriptionurl": f"https://commons.wikimedia.org/wiki/{title}",
        "extmetadata": {"LicenseShortName": {"value": license_name}, "Artist": {"value": artist}},
    }]}


def test_modern_collections_accept_credit_licenses_but_never_non_commercial_ones(net):
    pages = {str(i): commons_page(i, name) for i, name in enumerate(
        ["CC BY-SA 4.0", "CC BY 3.0", "CC0", "CC BY-NC 2.0", "CC BY-ND 2.0", "All rights reserved"], start=1)}
    net.add("w/api.php", FakeResponse({"query": {"pages": pages}}))

    results = popart.search("sunrise", 1, True, "any")["results"]

    assert [item["id"] for item in results] == ["1", "2", "3"]
    assert results[0]["artist"] == "Ann Artist" and results[0]["license"] == "CC BY-SA 4.0"


def test_modern_collections_search_one_category_and_leave_out_adult_work(net):
    net.add("w/api.php", FakeResponse({"query": {"pages": {}}}))

    popart.search("neon", 1, True, "any")

    search = net.calls[0]["params"]["gsrsearch"]
    assert search.startswith('deepcategory:"Pop art" neon ')
    # Commons does not combine deep categories, and the open art categories hold some adult work.
    assert search.count("deepcategory:") == 1 and "-hentai" in search and "-nude" in search


def test_older_collections_still_take_only_public_domain(net):
    pages = {"1": commons_page(1, "CC BY-SA 4.0"), "2": commons_page(2, "Public domain")}
    net.add("w/api.php", FakeResponse({"query": {"pages": pages}}))

    assert [item["id"] for item in ukiyoe.search("wave", 1, True, "any")["results"]] == ["2"]
    assert illustrations.license_note != ukiyoe.license_note


# --- Flickr ---------------------------------------------------------------------------


def flickr_photo(photo_id, license_code="4", width=3000, height=2000, url=True):
    photo = {"id": photo_id, "owner": "123@N01", "ownername": "Pat", "title": "Mural", "license": license_code,
             "datetaken": "2021-05-01 10:00:00", "url_z": "https://live.staticflickr.com/z.jpg"}
    if url:
        photo.update(url_o="https://live.staticflickr.com/o.jpg", width_o=width, height_o=height)
    return photo


def test_flickr_searches_only_free_licenses_and_credits_the_photographer(net, monkeypatch):
    set_keys(flickr={"api_key": "k"})
    net.add("services/rest", FakeResponse({"stat": "ok", "photos": {"pages": 3, "total": "70", "photo": [
        flickr_photo("1"), flickr_photo("2", license_code="2"), flickr_photo("3", width=900, height=600),
        flickr_photo("4", url=False), flickr_photo("5", license_code="9"),
    ]}}))

    page = flickr.search("street art", 1, True, "any")

    params = net.calls[0]["params"]
    assert params["method"] == "flickr.photos.search" and params["text"] == "street art"
    assert params["license"] == "4,5,9,10"   # never the non-commercial or no-derivatives kinds
    assert [item["id"] for item in page["results"]] == ["1", "5"]
    assert page["results"][0]["license"] == "CC BY (credit the photographer)"
    assert page["results"][1]["license"] == "CC0"
    assert page["results"][0]["artist"] == "Pat" and page["has_more"] is True and page["total"] == 70


def test_flickr_download_uses_the_largest_file_the_owner_allows(net, monkeypatch):
    set_keys(flickr={"api_key": "k"})
    net.add("services/rest", lambda url, params, json, headers: FakeResponse(
        {"stat": "ok", "photo": {"id": "9", "license": "5", "title": {"_content": "Mural"},
                                 "owner": {"realname": "Pat Painter"}, "dates": {"taken": "2020-01-01"},
                                 "urls": {"url": [{"_content": "https://www.flickr.com/photos/pat/9"}]}}}
        if params["method"] == "flickr.photos.getInfo" else
        {"stat": "ok", "sizes": {"size": [
            {"label": "Square", "width": 75, "height": 75, "source": "https://live.staticflickr.com/sq.jpg"},
            {"label": "Large", "width": "1024", "height": "683", "source": "https://live.staticflickr.com/l.jpg"},
            {"label": "Original", "width": "5000", "height": "3333", "source": "https://live.staticflickr.com/o.jpg"},
        ]}}))

    plan = flickr.plan("9", "fill")

    assert plan.url == "https://live.staticflickr.com/o.jpg" and plan.width == 5000
    assert plan.artist == "Pat Painter" and plan.license == "CC BY-SA (credit the photographer)"
    assert flickr.from_url("https://www.flickr.com/photos/pat/9/in/photostream/") == "9"


def test_flickr_hosts_with_numbered_subdomains_are_allowed_for_downloads():
    assert "live.staticflickr.com" in flickr.download_hosts and "farm66.staticflickr.com" in flickr.download_hosts
    assert "evil.example.com" not in flickr.download_hosts


# --- Pixabay --------------------------------------------------------------------------


def test_pixabay_reports_the_real_size_of_the_file_it_will_hand_over(net, monkeypatch):
    set_keys(pixabay={"api_key": "k"})
    net.add("pixabay.com/api", FakeResponse({"totalHits": 100, "hits": [
        {"id": 1, "tags": "cute, cartoon, fox, forest", "user": "Dee", "pageURL": "https://pixabay.com/illustrations/fox-1/",
         "webformatURL": "https://pixabay.com/w.jpg", "largeImageURL": "https://pixabay.com/l.jpg",
         "imageWidth": 6000, "imageHeight": 4000},
        {"id": 2, "tags": "big", "user": "Eve", "pageURL": "https://pixabay.com/illustrations/big-2/",
         "webformatURL": "https://pixabay.com/w2.jpg", "imageURL": "https://pixabay.com/o2.jpg",
         "imageWidth": 6000, "imageHeight": 4000},
    ]}))

    page = pixabay.search("cute fox", 1, True, "any")

    assert net.calls[0]["params"]["image_type"] == "illustration" and net.calls[0]["params"]["key"] == "k"
    small, full = page["results"]
    assert (small["width"], small["height"]) == (1280, 853)   # a free key only gets the 1280 px file
    assert (full["width"], full["height"]) == (6000, 4000)    # an approved key gets the original
    assert small["title"] == "Cute, Cartoon, Fox" and small["artist"] == "Dee"
    assert pixabay.from_url("https://pixabay.com/illustrations/fox-forest-cute-1/") == "1"


# --- Wallhaven (flagged) ----------------------------------------------------------------


def test_wallhaven_asks_for_safe_for_work_only_and_marks_the_license_unverified(net):
    net.add("wallhaven.cc/api/v1/search", FakeResponse({"meta": {"last_page": 4, "total": 90}, "data": [
        {"id": "abc123", "url": "https://wallhaven.cc/w/abc123", "path": "https://w.wallhaven.cc/full/ab/wallhaven-abc123.jpg",
         "dimension_x": 3840, "dimension_y": 2160, "thumbs": {"large": "https://th.wallhaven.cc/lg/ab/abc123.jpg"}},
        {"id": "nopath", "dimension_x": 100, "dimension_y": 100},
    ]}))

    page = wallhaven.search("pixel art", 2, True, "any")

    params = net.calls[0]["params"]
    assert params["purity"] == "100" and params["page"] == 2
    assert [item["id"] for item in page["results"]] == ["abc123"]
    assert page["results"][0]["license"] == "License not verified (personal use)"
    assert page["has_more"] is True and wallhaven.flagged is True
    assert wallhaven.from_url("https://wallhaven.cc/w/abc123") == "abc123"


def test_wallhaven_refuses_a_link_to_an_adult_wallpaper(net):
    net.add("wallhaven.cc/api/v1/w/", FakeResponse({"data": {"id": "abc123", "purity": "nsfw", "path": "https://w.wallhaven.cc/x.jpg"}}))
    with pytest.raises(DiscoverError):
        wallhaven.get("abc123")


# --- DeviantArt (flagged) ---------------------------------------------------------------


def da_deviation(dev_id, downloadable=True, mature=False, src="https://images-wixmp-x.wixmp.com/f/a.jpg"):
    return {"deviationid": dev_id, "title": "Neon Cat", "url": f"https://www.deviantart.com/artist/art/neon-cat-{dev_id}",
            "author": {"username": "artist"}, "is_downloadable": downloadable, "is_mature": mature,
            "content": {"src": src, "width": 3000, "height": 2000}, "published_time": "1700000000",
            "thumbs": [{"src": "https://images-wixmp-x.wixmp.com/t.jpg"}]}


def test_deviantart_signs_in_as_the_app_and_offers_only_downloadable_non_mature_art(net, monkeypatch):
    set_keys(deviantart={"client_id": "id", "client_secret": "secret"})
    net.add("oauth2/token", FakeResponse({"access_token": "tok", "expires_in": 3600}))
    net.add("browse/popular", FakeResponse({"has_more": True, "results": [
        da_deviation("1"), da_deviation("2", downloadable=False), da_deviation("3", mature=True),
    ]}))

    page = deviantart.search("neon cat", 1, True, "any")

    token_call = next(c for c in net.calls if c["url"].endswith("/oauth2/token"))
    assert token_call["data"]["grant_type"] == "client_credentials"
    search_call = next(c for c in net.calls if "browse/popular" in c["url"])
    assert search_call["params"]["access_token"] == "tok" and search_call["params"]["mature_content"] == "false"
    assert [item["id"] for item in page["results"]] == ["1"]
    assert page["results"][0]["artist"] == "artist" and page["has_more"] is True

    deviantart.search("again", 1, True, "any")
    assert len([c for c in net.calls if c["url"].endswith("/oauth2/token")]) == 1   # the token is reused


def test_deviantart_downloads_the_original_the_artist_allows(net, monkeypatch):
    set_keys(deviantart={"client_id": "id", "client_secret": "secret"})
    net.add("oauth2/token", FakeResponse({"access_token": "tok", "expires_in": 3600}))
    net.add("deviation/download/", FakeResponse({"src": "https://images-wixmp-x.wixmp.com/orig.png", "width": 5000, "height": 3000}))
    net.add("oauth2/deviation/", FakeResponse(da_deviation("1")))

    plan = deviantart.plan("1", "fill")

    assert plan.url.endswith("orig.png") and plan.width == 5000
    assert plan.license == "License not verified (personal use)"
    assert "foo.wixmp.com" in deviantart.download_hosts and "evil.example.com" not in deviantart.download_hosts


def test_deviantart_credentials_that_are_refused_fail_clearly(net, monkeypatch):
    set_keys(deviantart={"client_id": "id", "client_secret": "wrong"})
    net.add("oauth2/token", FakeResponse({"error": "invalid_client"}))
    with pytest.raises(DiscoverError):
        deviantart.search("x", 1, True, "any")


def test_smithsonian_collections_have_distinct_units():
    assert (saam.unit, cooper_hewitt.unit) == ("SAAM", "CHNDM")

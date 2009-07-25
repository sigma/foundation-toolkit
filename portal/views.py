from django.template import Context, loader
from django.http import HttpResponse

from google.appengine.api import users

def index(request):
    t = loader.get_template('portal.html')
    uri = request.build_absolute_uri()
    user = users.get_current_user()
    if user:
        url = users.create_logout_url(uri)
        url_linktext = 'Logout'
    else:
        url = users.create_login_url(uri)
        url_linktext = 'Login'

    _install_gears = """if (!window.google || !google.gears) {
    location.href = "http://gears.google.com/?action=install&message=You will need Gears to access full functionnality for Foundation Toolkit&return=%s";
    }""" % (uri)

    _create_store = """var localServer = google.gears.factory.create('beta.localserver');
      var store = localServer.createManagedStore('ftk-store');
      store.manifestUrl = 'site-manifest.txt';
      store.checkForUpdate();"""

    _install_text = """Index page for fondation-hacks. There is little to see here, only serves as installation point.

<a href="/tools/ftk.user.js">Greasemonkey user script</a>
"""
    c = Context({
        'css_sheets': ["/css/arctic.css"],
        'js_files': ["/scripts/gears_init.js"],
        'js_blocks': [_install_gears, _create_store],
        'text': _install_text,
        'user': user,
        'log_url': url,
        'log_txt': url_linktext,
    })
    return HttpResponse(t.render(c))

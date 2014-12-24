pushd public
cleancss -o all.css bower_components/bootstrap/dist/css/bootstrap.css bower_components/bootstrap-select/bootstrap-select.css bower_components/selectize/dist/css/selectize.bootstrap3.css bower_components/hopscotch/dist/css/hopscotch.css bower_components/highlightjs/styles/default.css css/*.css
uglifyjs \
    bower_components/jquery/dist/jquery.js \
    bower_components/angular/angular.js \
    bower_components/angular-animate/angular-animate.js \
    otherjs/angular-bootstrap-nav-tree/dist/abn_tree_directive.js \
    bower_components/sifter/sifter.js \
    bower_components/microplugin/src/microplugin.js \
    bower_components/selectize/dist/js/selectize.js \
    bower_components/bootstrap/dist/js/bootstrap.js \
    bower_components/handlebars/handlebars.js \
    bower_components/underscore/underscore.js \
    bower_components/bootstrap-select/bootstrap-select.js \
    bower_components/momentjs/moment.js \
    otherjs/filedrop/filedrop.js \
    bower_components/google-diff-match-patch-js/diff_match_patch_uncompressed.js \
    bower_components/FileSaver/FileSaver.js \
    otherjs/finddeep.js \
    otherjs/ace/ace.js \
    bower_components/highlightjs/highlight.pack.js \
    bower_components/marked/lib/marked.js \
    bower_components/jspdf/dist/jspdf.debug.js \
    otherjs/jspdf.plugin.from_html.js \
    otherjs/jspdf.plugin.standard_fonts_metrics.js \
    otherjs/jspdf.plugin.split_text_to_size.js \
    ../node_modules/browserchannel/dist/bcsocket.js \
    ../node_modules/share/webclient/share.uncompressed.js \
    ../node_modules/share/webclient/text.js \
    -c -o thirdparty.js
popd

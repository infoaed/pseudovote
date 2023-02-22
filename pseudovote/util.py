import asyncio

from datetime import datetime, timedelta
from pathlib import Path

def read_lines(filename, ignore = False):
    """
    Read text file into list, if no file, return empty list.
    """
    path = Path(filename)
    if path.is_file():
        with open(filename) as f:
            lines = f.read().splitlines()
    else:
        if ignore:
            lines=[]
        else:
            m = f"Can't read '{filename}'. Wrong directory?"
            raise Exception(m)
    
    return lines

def to_list(body, key):
    """
    Convert request body to list instead of text with newlines.
    """
    if key in body:
      lines = body[key].splitlines()
      body[key] = lines
      
    return body

def datetime_representation(dt = None):
    """
    Convert datetime into format that Javascript reads with timezone etc.
    """
    if dt is None:
        dt = datetime.now().astimezone()
    
    return dt.isoformat()

async def wait_until(stop):
    """
    Sleep until next move is needed.
    """
    now = datetime.now().astimezone()
    await asyncio.sleep((stop - now).total_seconds())
    
def run_at(dt, callback, *args):
    """
    Create coroutine starting at certain moment.
    """
    now = datetime.now().astimezone()
    loop = asyncio.get_event_loop()
    return loop.call_at(loop.time() + (dt - now).total_seconds(), callback, *args)

def already_passed(stop):
    """
    If the moment has already passed.
    """
    now = datetime.now().astimezone()
    if(stop<=now):
        return True
    else:
        return False

def create_choice_html(r, index, classname, typename, ordered = False):
    """
    Create HTML for displaying choices on vote collecting web page (in conjunction with `templates/collect.js`).
    """
    html = ""
    
    r_name = f"{classname}_{index}"
    fs_name = f"fs_{index}"
    
    html += f'<p><fieldset itemscope itemtype="https://schema.org/VoteAction" id="{fs_name}" name="{fs_name}" class="choice" data-min="{r["min"]}" data-max="{r["max"]}" data-ordered={str(r["ordered"]).lower()} data-section="{index}"><legend>{index}. {r["title"]}</legend>'
    if ordered:
        html += f'<ol name="list_{index}" id="list_{index}">'
    for x in r['choices']:
        if not ordered:
            html += f'<input itemprop="actionOption" class="{classname}" type="{typename}" name="{r_name}" value="{x}" disabled> <label itemprop="name" for="{x}">{x}</label><br>'
        else:
            html += f'<li itemprop="name"><input itemprop="actionOption" class="{classname}" type="{typename}" name="{r_name}" value="{x}" disabled> {x}</li>'            
    if ordered:
        html += '</ol>'       
    html += '</fieldset></p>'

    if not ordered:
        html += '''
            <script>
                var rad = document.vote_form.''' + r_name + ''';
                for (var i = 0; i < rad.length; i++) {
                    rad[i].addEventListener("change", function() {
                        fillBallot();
                    });
                }
            </script>\n'''
    else:
        html += '''
            <script>               
                var list = document.getElementById("list_''' + str(index) + '''");
                var rad = document.vote_form.''' + r_name + ''';
                  
                for (var i = 0; i < rad.length; i++) {
                    list.children[i].value = 0;
                    list.children[i].draggable = false;
                    rad[i].checked = false;
                    rad[i].addEventListener("change", function() {
                    
                        list = document.getElementById("list_''' + str(index) + '''");
                        rad = document.vote_form.''' + r_name + ''';

                        if (this.checked) {

                            var nonz = 0;
                            var pos = 0;
                            for (var i = 0; i < rad.length; i++) {
                              if (rad[i].checked) nonz++;
                              else if (pos == 0) pos=i;
                            }

                            if(nonz==1) pos=0;

                            this.parentNode.value = nonz;
                            this.parentNode.style="list-style-type: decimal;";
                            this.parentNode.className="draggable";
                            this.parentNode.draggable = true;

                            if(nonz<rad.length)
                                list.insertBefore(this.parentNode, list.children[pos]);

                        } else {
                        
                            this.parentNode.style="list-style-type: none;";
                            this.parentNode.className="";
                            this.parentNode.draggable = false;

                            var pos = 0;

                            for (var i = rad.length-1; i >= 0; i--) {
                              if (rad[i].checked) {
                                pos=i;
                                break;
                              }
                            }

                            if(pos<rad.length-2)
                              list.insertBefore(this.parentNode, list.children[pos+1]);
                            else list.appendChild(this.parentNode);

                        }

                        enumerateCheckBoxes(rad, list);
                        fillBallot();
                    });
                }
            </script>\n'''
        
    return html


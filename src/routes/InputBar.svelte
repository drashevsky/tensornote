<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    let text : string = '';
    // let oldtext : string = '';
    let debounce : NodeJS.Timeout = setTimeout(() => {}, 0); 

    function inputBarUpdated() {
        
        // Make sure embedding is updated every 125 ms
        clearTimeout(debounce);
        debounce = setTimeout((async (t : string) => {
            if (text == t)
                dispatch('inputbarupdate', {text, submit: false});
        }).bind(null, text), 125);

        // Trigger re-embed every 4 characters or every word
        // if (text.split(" ").length != oldtext.split(" ").length || 
        //    Math.abs(text.length - oldtext.length) >= 4) {
        //    oldtext = text;
        //    dispatch('inputbarupdate', {text});
        // }
    }

    function handleSubmit(e : KeyboardEvent) {
        if (e.key == "Enter" && text != "") {
            e.preventDefault();
            clearTimeout(debounce);
            dispatch('inputbarupdate', {text, submit: true});
            text = "";
        }
    }

    $: text && inputBarUpdated();
</script>

<div class="fixed bottom-0 w-full h-[20%]">
    <textarea class="w-full h-full" placeholder="Type or search for a note." 
        bind:value={text}
        on:keydown={handleSubmit}/>
</div>
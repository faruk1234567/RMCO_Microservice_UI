import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuService } from './menu.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  api = inject(MenuService);
  private host = inject(ElementRef<HTMLElement>);

  /** Kon level e kon menu khola: [topLevelId, subId, subSubId] */
  openPath = signal<number[]>([]);

  ngOnInit() { this.api.loadNav(); }

  isOpen(depth: number, id: number) { return this.openPath()[depth] === id; }

  toggle(depth: number, id: number) {
    const p = this.openPath();
    this.openPath.set(p[depth] === id ? p.slice(0, depth) : [...p.slice(0, depth), id]);
  }

  close() { this.openPath.set([]); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target as Node)) this.close();
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.close(); }
}
